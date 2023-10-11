# React Flow to Windmill

[Windmill](https://windmill.dev) is a low-code workflow engine. It offers a dashboard to edit workflows, and it covers you needs most of the time.

But, it happens that you want to embed a flow editor in your own application, to let your users build their workflows from your application and not from Windmill's dashboard.

Windmill builds in the open, and exposes an OpenAPI specification one can use to communicate with its API, and create or edit workflows.

One great solution to create a flow editor in the React world is [React Flow](https://reactflow.dev/). You can customize everything. Nodes and edges are HTML elements that can even be styled with Tailwind CSS.

I will explain how we can go from React Flow to Windmill.

## 1. Get the flow from React Flow

With React Flow, a flow is made by two entities: nodes and edges.

Nodes are wired by edges. A node can be alone, being wired to no other node.

An edge has always a *source* and a *target*. Nodes can have several *handles*, leading edges to be wired to a specific *sourceHandle* and *targetHandle*.

The most basic configuration for React Flow is:

```tsx
import React, { useCallback } from 'react';
import ReactFlow, { useNodesState, useEdgesState, addEdge } from 'reactflow';
import 'reactflow/dist/style.css';

const initialNodes = [
  { id: '1', position: { x: 0, y: 0 }, data: { label: '1' } },
  { id: '2', position: { x: 0, y: 100 }, data: { label: '2' } },
];
const initialEdges = [{ id: 'e1-2', source: '1', target: '2' }];

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
      />
    </div>
  );
}
```

It's important to understand what data React Flow outputs.

Nodes are defined as:

```ts
import { type Node } from 'reactflow';

const node: Node = {
  id: '1', // The unique identifier of the node
  position: { x: 0, y: 0 }, // The coordinates of the node
  type: 'input', // React Flow supports some node types out-of-the-box, but you can also create your own types
  // Put any data you need in the `data` object.
  data: {
    label: 'Flow input', // The label is used by default nodes to display a text.
  },
};
```

There are great chances that you'll want to create your own nodes as React components. See how [`customTypes`](https://github.com/Devessier/reactflow-to-windmill/blob/02953b9a04fe46a2b11df5ea748283379d4fd963/src/custom-nodes.ts#L5-L9) are [provided to the `<ReactFlow />` component](https://github.com/Devessier/reactflow-to-windmill/blob/02953b9a04fe46a2b11df5ea748283379d4fd963/src/App.tsx#L134).

Edges are defined as:

```ts
import { type Edge } from 'reactflow';

const edge: Edge = {
  id: 'e1-2', // The unique identifier of the edge
  source: '1', // The source node of the edge
  sourceHandle: 'default', // Nodes can have several handles, this is the id of the source handle the edge comes from
  target: '2', // The target node of the edge
};
```

Note that nodes have several source handles in one case when applied to a Windmill flow: for conditions. Each branch of a condition node will be a *sourceHandle*.

I won't go too much into the details of implementing the UI for a Flow Builder with React Flow as it would change between two projects. Instead, I'm going to focus on transforming the output of React Flow, that is, a list of nodes and a list of edges, into a Windmill workflow.

The code in this repository serves as a simplistic example of a Flow Builder built with React Flow. Feel free to use it as foundation for your own Flow Builder.

## 2. Nodes and edges to OpenFlow

Windmill team has created an [OpenAPI specification describing the shape of a flow](https://github.com/windmill-labs/windmill/blob/d51fc57c42c526cf93336866d90ee7a9ff27a402/openflow.openapi.yaml), and gave it the name of **OpenFlow**.

Windmill also exposes the [OpenAPI specification describing the routes its backend supports](https://github.com/windmill-labs/windmill/blob/d51fc57c42c526cf93336866d90ee7a9ff27a402/backend/windmill-api/openapi.yaml).

By using a tool like [openapi-typescript-codegen](https://www.npmjs.com/package/openapi-typescript-codegen), we can generate TypeScript types for the OpenFlow specification, and functions to make requests to Windmill's backend.

The main difficulty here is to take a list of nodes and a list of edges, and transform it into an OpenFlow, which is like a typed JSON object.

Let's say we have several types of custom nodes.

An input node, representing the beginning of a Windmill flow, taking some inputs.

```ts
const inputNode = {
  id: '...',
  type: 'input',
  data: {
    type: 'input',
    properties: [
      {
        id: '...',
        name: 'resource_id',
        type: 'number',
        required: true,
      },
    ],
  },
};
```

A condition node, representing logical branches and containing the JavaScript expression to evaluate for each condition.

```ts
const conditionNode = {
  id: '...',
  type: 'condition',
  data: {
    type: 'condition',
    conditions: [
      {
        id: '...',
        label: 'Is admin',
        expression: "authorization_level === 'ADMIN'",
      },
      {
        id: '...',
        label: 'Is user',
        expression: "authorization_level === 'USER'",
      },
    ],
  },
};
```

Each Windmill flow has a *default* branch, which is taken when no other branch matches. It's not materialized in the conditions array as it's not configurable.

Finally, we have a third node type: actions. Actions are scripts evaluated by Windmill and that can take parameters.

```ts
const conditionNode = {
  id: '...',
  type: 'action',
  data: {
    type: 'action',
    actionName: 'f/shared/graphql_request',
    inputs: [
      {
        id: '...',
        parameter: 'request_body',
        expression: "'body'",
      },
      {
        id: '...',
        parameter: 'request_variables',
        expression: "{ resource_id: flow_input.resource_id }",
      },
    ],
  },
};
```

The list of nodes React Flow outputs is made of these custom nodes. To build the OpenFlow version of this, we first need to locate the input node from which the flow begins.

```ts
const startNode = nodes.find((n) => n.data.type === "input");
```

Then, we need to build the list of nodes that follow the start node. Each step of an OpenFlow is a `FlowModule` object. This type defines what should the step do (is it an action, a condition?), and allows configuring parameters like retries, timeout and summary.

We'll build this `modules` array recursively.

```ts
const startNode = nodes.find((n) => n.data.type === "input");

const modules = addNodesToModuleList({
  initialNode: startNode,
  edges,
  nodes,
  modules: [],
});

function addNodesToModuleList({
  initialNode,
  edges,
  nodes,
  modules,
}: {
  initialNode: FlowNode;
  nodes: FlowNode[];
  edges: FlowEdge[];
  modules: FlowModule[];
}) {}
```

The `addNodesToModuleList` function is going to branch based on the type of the currently processed node: `initialNode`.

```ts
function addNodesToModuleList({
  initialNode,
  edges,
  nodes,
  modules,
}: {
  initialNode: FlowNode;
  nodes: FlowNode[];
  edges: FlowEdge[];
  modules: FlowModule[];
}) {
  switch (initialNode.data.type) {
    case "input": {
      break;
    }
    case "action": {
      break;
    }
    case "condition": {
      break;
    }
    default: {
      break;
    }
  }
}
```

When `initialNode.data.type` is `"input"` or an unknown value, falling back to the `default` case, we want to do nothing.

When reaching an action node, we want to add it to the modules list.

```ts
function addNodesToModuleList({
  initialNode,
  edges,
  nodes,
  modules,
}: {
  initialNode: FlowNode;
  nodes: FlowNode[];
  edges: FlowEdge[];
  modules: FlowModule[];
}) {
  switch (initialNode.data.type) {
    case "action": {
      const formattedModule: FlowModule = {
        id: initialNode.id,
        value: {
          type: "script",
          path: initialNode.data.actionName!,
          input_transforms: Object.fromEntries(
            initialNode.data.inputs.map(({ parameter, expression }) => [
              parameter,
              {
                type: "javascript",
                expr: expression,
              },
            ])
          ),
        },
      };

      modules.push(formattedModule);

      break;
    }
  }
}
```

We create a `FlowModule` for a `script`. We transform the inputs of the node to an object called `input_transforms`. It will have this shape:

```ts
const value = {
  input_transforms: {
    query: {
      type: "javascript",
      expr: "'query {}'",
    },
    variables: {
      type: "javascript",
      expr: "({ account_id: flow_input.accountId })",
    }
  }
}
```

After having processed the node, we want to process the next one respecting the flow order.

```ts
function addNodesToModuleList({
  initialNode,
  edges,
  nodes,
  modules,
}: {
  initialNode: FlowNode;
  nodes: FlowNode[];
  edges: FlowEdge[];
  modules: FlowModule[];
}) {
  switch (initialNode.data.type) { /** ... */ }

  switch (initialNode.data.type) {
    case "condition": {
      break;
    }
    default: {
      const nextNodeResult = findNextNode({
        currentNode: initialNode,
        edges,
        nodes,
      });
      if (nextNodeResult.ok === false) {
        return modules;
      }

      return addNodesToModuleList({
        initialNode: nextNodeResult.nextNode,
        edges,
        nodes,
        modules,
      });
    }
  }
}
```

In the second switch statement, we let the condition for `condition` nodes empty for now. Whatever the type of the node is, we try to find the next node and then start processing the next module by calling `addNodesToModuleList` recursively with the next node.

Finding the next node means finding the edge beginning from the current node, and then finding the node targeted by this edge for a particular handle.

```ts
function findNextNode({
  currentNode,
  nodes,
  edges,
}: {
  currentNode: FlowNode;
  nodes: FlowNode[];
  edges: FlowEdge[];
}): { ok: true; nextNode: FlowNode } | { ok: false } {
  const edgeFromNode = edges.find((e) => e.source === currentNode.id);
  if (edgeFromNode === undefined) {
    return { ok: false };
  }

  const targetNode = nodes.find((n) => n.id === edgeFromNode.target);
  if (targetNode === undefined) {
    return { ok: false };
  }

  return {
    ok: true,
    nextNode: targetNode,
  };
}
```

Processing a condition node is a bit more difficult, as it will lead to as many modules list as it has branches.

```ts
function addNodesToModuleList({
  initialNode,
  edges,
  nodes,
  modules,
}: {
  initialNode: FlowNode;
  nodes: FlowNode[];
  edges: FlowEdge[];
  modules: FlowModule[];
}) {
  switch (initialNode.data.type) {
    /** ...  */
    case "condition": {
      const defaultCaseEdge = edges.find(
        (edge) =>
          edge.source === initialNode.id && edge.sourceHandle === "default"
      );
      const defaultModules: FlowModule[] = [];

      if (defaultCaseEdge !== undefined) {
        const defaultCaseFirstNode = nodes.find(
          (node) => node.id === defaultCaseEdge.target
        );
        if (defaultCaseFirstNode === undefined) {
          console.error("Could not find default case node for condition", {
            defaultCaseEdgeId: defaultCaseEdge.id,
          });

          break;
        }

        addNodesToModuleList({
          initialNode: defaultCaseFirstNode,
          edges,
          nodes,
          modules: defaultModules,
        });
      }

      const branches: BranchOne["branches"] = [];

      for (const condition of (
        initialNode as FlowNode & { data: { type: "condition" } }
      ).data.conditions) {
        const branchEdge = edges.find(
          (edge) =>
            edge.source === initialNode.id && edge.sourceHandle === condition.id
        );
        if (branchEdge === undefined) {
          console.error("Could not find case edge for condition", {
            initialNodeId: initialNode.id,
          });

          break;
        }

        const branchFirstNode = nodes.find(
          (node) => node.id === branchEdge.target
        );
        if (branchFirstNode === undefined) {
          console.error("Could not find case node for condition", {
            branchEdgeId: branchEdge.id,
          });

          break;
        }

        const branchModules: FlowModule[] = [];

        addNodesToModuleList({
          initialNode: branchFirstNode,
          edges,
          nodes,
          modules: branchModules,
        });

        branches.push({
          summary: condition.label,
          expr: condition.expression,
          modules: branchModules,
        });
      }

      const conditionModule: FlowModule = {
        id: initialNode.id,
        summary: "",
        value: {
          type: "branchone",
          default: defaultModules,
          branches,
        },
      };

      modules.push(conditionModule);

      break;
    }
  }

  switch (initialNode.data.type) { /** ... */ }
}
```

First, we check whether there is a default branch that should be processed. If so, we call `addNodesToModuleList` recursively to process all the child nodes of this branch.

Then, we execute each branch the same way, and end up wiring all branches in the `conditionModule` object.

In OpenFlow, a condition node is always the last module of its parent's `modules` because all branches, even the default one, are children of the condition node in `branches` property. As a consequence, the process we applied to the node above is all we need to do for condition nodes, there is no need to find the next node as we did for action nodes.

```ts
function addNodesToModuleList({
  initialNode,
  edges,
  nodes,
  modules,
}: {
  initialNode: FlowNode;
  nodes: FlowNode[];
  edges: FlowEdge[];
  modules: FlowModule[];
}) {
  switch (initialNode.data.type) { /** ... */ }

  switch (initialNode.data.type) {
    case "condition": {
      /**
       * No other node can be put after a condition.
       * Nodes are necessarily put under either the default branch or a specfic branch.
       */
      return modules;
    }
    default: {
      /** ... */
    }
  }
}
```

Finally, we use the modules to create the `OpenFlow` object.

```ts
const openFlow: OpenFlow = {
  summary: "",
  description: "",
  value: {
    modules,
  },
  schema: {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    type: "object",
    properties: Object.fromEntries(
      startNode.data.properties.map((property) => [
        property.name,
        {
          description: "",
          type: property.type.toLowerCase(),
        },
      ])
    ),
    required: [],
  },
}
```

The `schema` property defines the input the workflow takes. We construct a JSON Schema from the data held by the `startNode`.

## 3. Send the OpenFlow to Windmill

Once you built an OpenFlow object, you may want to create or update a workflow in Windmill. We can do it by using the FlowService, automatically generated by `openapi-typescript-codegen`.

```ts
const flowPath = `f/flows/id`;
const requestParams = {
  workspace: "your-workspace",
  path: flowPath,
  requestBody: {
    path: flowPath,
    ...openFlow,
  },
};

if (workflowAlreadyExists === true) {
  await FlowService.updateFlow(requestParams);
} else {
  await FlowService.createFlow(requestParams);
}
```
