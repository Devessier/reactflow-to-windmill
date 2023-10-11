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

I assume that we have several custom types of nodes.

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
