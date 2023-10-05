import { Edge, Node } from "reactflow";
import { BranchOne, FlowModule, FlowValue } from "./windmill/gen";
import { CustomNodeData } from "./custom-nodes";

type FlowNode = Node<CustomNodeData>;
type FlowEdge = Edge;

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
  console.log("add node to module list", {
    initialNode,
    edges,
    nodes,
    modules,
  });

  switch (initialNode.data.type) {
    case "input": {
      break;
    }
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
    default: {
      break;
    }
  }

  switch (initialNode.data.type) {
    case "condition": {
      /**
       * No other node can be put after a condition.
       * Nodes are necessarily put under either the default branch or a specfic branch.
       */
      return modules;
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

export function buildFlowsFromNodesAndEdges({
  edges,
  nodes,
}: {
  edges: FlowEdge[];
  nodes: FlowNode[];
}):
  | {
      ok: true;
      flow: {
        summary: string;
        description: string;
        schema: unknown;
        value: FlowValue;
      };
    }
  | { ok: false; err: string } {
  const startNode = nodes.find((n) => n.data.type === "input") as FlowNode & {
    data: { type: "input" };
  };
  if (startNode === undefined) {
    return {
      ok: false,
      err: "No start node",
    };
  }

  return {
    ok: true,
    flow: {
      summary: "",
      description: "",
      value: {
        modules: addNodesToModuleList({
          initialNode: startNode,
          edges,
          nodes,
          modules: [],
        }),
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
    },
  };
}
