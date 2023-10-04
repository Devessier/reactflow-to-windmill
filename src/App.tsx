import { nanoid } from "nanoid";
import { DragEvent, useCallback, useRef, useState } from "react";
import ReactFlow, {
  Connection,
  Controls,
  Edge,
  Node,
  ReactFlowInstance,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
} from "reactflow";
import "reactflow/dist/style.css";
import {
  ActionNodeData,
  ConditionNodeData,
  CustomNodeData,
  InputNodeData,
  customNodes,
} from "./custom-nodes";

const initialNodes: Node<CustomNodeData>[] = [
  {
    id: "input",
    position: { x: 250, y: 20 },
    type: "app-input",
    data: { type: "input", properties: [] },
  },
];
const initialEdges: Edge[] = [];

type NodeType = "app-action" | "app-condition";

function App() {
  const reactFlowWrapper = useRef<HTMLDivElement | null>(null);
  const [reactFlowInstance, setReactFlowInstance] =
    useState<ReactFlowInstance | null>(null);
  const [nodes, setNodes, onNodesChange] =
    useNodesState<CustomNodeData>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const selectedNode = nodes.find((node) => node.selected === true);

  const panelToDisplay =
    selectedNode === undefined
      ? "json"
      : selectedNode.type === "app-input"
      ? "input"
      : selectedNode.type === "app-condition"
      ? "condition"
      : selectedNode.type === "app-action"
      ? "action"
      : undefined;

  console.log("selectedNode", selectedNode);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const availableNodeTypes: Record<NodeType, string> = {
    "app-action": "Action",
    "app-condition": "Condition",
  };

  const onDragStart = (event: DragEvent, nodeType: NodeType) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current!.getBoundingClientRect();
      const type = event.dataTransfer.getData("application/reactflow");

      // check if the dropped element is valid
      if (typeof type === "undefined" || !type) {
        return;
      }

      const position = reactFlowInstance!.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      setNodes((nds) => {
        if (type === "app-action") {
          return nds.concat({
            id: nanoid(),
            position,
            type: "app-action",
            data: { type: "action", actionName: undefined },
          });
        }

        if (type === "app-condition") {
          return nds.concat({
            id: nanoid(),
            position,
            type: "app-condition",
            data: { type: "condition", conditions: [] },
          });
        }

        return nds;
      });
    },
    [reactFlowInstance, setNodes]
  );

  return (
    <ReactFlowProvider>
      <div className="min-h-screen h-full grid grid-rows-1 grid-cols-2 divide-x">
        <div className="grid grid-rows-[1fr,auto] divide-y">
          <div ref={reactFlowWrapper} className="grid grid-cols-1 grid-rows-1">
            <ReactFlow
              nodeTypes={customNodes}
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onInit={setReactFlowInstance}
              onDrop={onDrop}
              onDragOver={onDragOver}
              fitView
            >
              <Controls />
            </ReactFlow>
          </div>

          <div className="grid grid-cols-2 gap-x-4 p-4">
            {Object.entries(availableNodeTypes).map(([type, label]) => (
              <div
                key={type}
                className="flex justify-center items-center text-center px-4 py-4 border text-slate-800 rounded-md relative bg-slate-200 font-mono cursor-move"
                draggable
                onDragStart={(event) => onDragStart(event, type as NodeType)}
              >
                {label}
              </div>
            ))}
          </div>
        </div>

        <div className="p-4">
          {panelToDisplay === "json" ? (
            <>
              <h2 className="font-semibold text-xl">JSON Workflow</h2>
            </>
          ) : panelToDisplay === "input" ? (
            <>
              <h2 className="font-semibold text-xl mb-6">Input</h2>

              <WorkflowInputForm
                node={selectedNode as Node<InputNodeData>}
                setNode={(node) => {
                  setNodes((nodes) =>
                    nodes.map((n) => {
                      if (node.id !== n.id) {
                        return n;
                      }

                      return node;
                    })
                  );
                }}
              />
            </>
          ) : panelToDisplay === "action" ? (
            <>
              <h2 className="font-semibold text-xl mb-6">Action</h2>

              <ActionForm
                node={selectedNode as Node<ActionNodeData>}
                setNode={(node) => {
                  setNodes((nodes) =>
                    nodes.map((n) => {
                      if (node.id !== n.id) {
                        return n;
                      }

                      return node;
                    })
                  );
                }}
              />
            </>
          ) : panelToDisplay === "condition" ? (
            <>
              <h2 className="font-semibold text-xl mb-6">Condition</h2>

              <ConditionBranchesForm
                node={selectedNode as Node<ConditionNodeData>}
                setNode={(node) => {
                  setNodes((nodes) =>
                    nodes.map((n) => {
                      if (node.id !== n.id) {
                        return n;
                      }

                      return node;
                    })
                  );
                }}
              />
            </>
          ) : null}
        </div>
      </div>
    </ReactFlowProvider>
  );
}

function WorkflowInputForm({
  node,
  setNode,
}: {
  node: Node<InputNodeData>;
  setNode: (node: Node<InputNodeData>) => void;
}) {
  const [properties, setProperties] = useState(() =>
    node.data.properties.concat({ id: nanoid(), name: "", type: "string" })
  );

  return (
    <form
      className="flex flex-col gap-y-4"
      onSubmit={(e) => {
        e.preventDefault();

        setNode({ ...node, data: { ...node.data, properties } });
      }}
    >
      {properties.map(({ id, name, type }, index) => (
        <div key={id} className="grid grid-cols-[1fr,1fr,auto] gap-x-4">
          <input
            value={name}
            placeholder="Property"
            className="block w-full rounded-md border-0 px-1 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            onChange={(e) => {
              setProperties(
                properties.map((p, i) => {
                  if (i !== index) {
                    return p;
                  }

                  return Object.assign({}, properties[index], {
                    name: e.currentTarget.value,
                  });
                })
              );
            }}
          />

          <select
            value={type}
            className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
            onChange={(e) => {
              setProperties(
                properties.map((p, i) => {
                  if (i !== index) {
                    return p;
                  }

                  return Object.assign({}, properties[index], {
                    type: e.currentTarget.value,
                  });
                })
              );
            }}
          >
            <option value="" disabled hidden>
              Nothing selected
            </option>

            <option>string</option>
            <option>number</option>
          </select>

          <button
            type="button"
            onClick={() => {
              setProperties(
                properties.filter((p, i) => {
                  return i !== index;
                })
              );
            }}
          >
            🗑️
          </button>
        </div>
      ))}

      <button
        type="button"
        className="rounded-full bg-white px-2.5 py-1 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 place-self-center"
        onClick={() => {
          setProperties([
            ...properties,
            { id: nanoid(), name: "", type: "string" },
          ]);
        }}
      >
        Add property
      </button>

      <button
        type="submit"
        className="mt-6 rounded-md bg-indigo-600 px-2.5 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
      >
        Save
      </button>
    </form>
  );
}

function ConditionBranchesForm({
  node,
  setNode,
}: {
  node: Node<ConditionNodeData>;
  setNode: (node: Node<ConditionNodeData>) => void;
}) {
  const [conditions, setConditions] = useState(() =>
    node.data.conditions.concat({ id: nanoid(), label: "", expression: "" })
  );

  return (
    <form
      className="flex flex-col gap-y-4"
      onSubmit={(e) => {
        e.preventDefault();

        setNode({ ...node, data: { ...node.data, conditions } });
      }}
    >
      {conditions.map(({ id, label, expression }, index) => (
        <div key={id} className="grid grid-cols-[1fr,1fr,auto] gap-x-4">
          <input
            value={label}
            placeholder="Label"
            className="block w-full rounded-md border-0 px-1 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            onChange={(e) => {
              setConditions(
                conditions.map((p, i) => {
                  if (i !== index) {
                    return p;
                  }

                  return Object.assign({}, conditions[index], {
                    label: e.currentTarget.value,
                  });
                })
              );
            }}
          />

          <input
            value={expression}
            placeholder="Expression"
            className="block w-full rounded-md border-0 px-1 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            onChange={(e) => {
              setConditions(
                conditions.map((p, i) => {
                  if (i !== index) {
                    return p;
                  }

                  return Object.assign({}, conditions[index], {
                    expression: e.currentTarget.value,
                  });
                })
              );
            }}
          />

          <button
            type="button"
            onClick={() => {
              setConditions(
                conditions.filter((p, i) => {
                  return i !== index;
                })
              );
            }}
          >
            🗑️
          </button>
        </div>
      ))}

      <button
        type="button"
        className="rounded-full bg-white px-2.5 py-1 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 place-self-center"
        onClick={() => {
          setConditions([
            ...conditions,
            { id: nanoid(), label: "", expression: "" },
          ]);
        }}
      >
        Add branch
      </button>

      <button
        type="submit"
        className="mt-6 rounded-md bg-indigo-600 px-2.5 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
      >
        Save
      </button>
    </form>
  );
}

function ActionForm({
  node,
  setNode,
}: {
  node: Node<ActionNodeData>;
  setNode: (node: Node<ActionNodeData>) => void;
}) {
  const [actionName, setActionName] = useState(node.data.actionName);

  return (
    <form
      className="flex flex-col gap-y-4"
      onSubmit={(e) => {
        e.preventDefault();

        setNode({ ...node, data: { ...node.data, actionName } });
      }}
    >
      <input
        value={actionName}
        placeholder="Name of the action"
        className="block w-full rounded-md border-0 px-1 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
        onChange={(e) => {
          setActionName(e.currentTarget.value);
        }}
      />

      <button
        type="submit"
        className="mt-6 rounded-md bg-indigo-600 px-2.5 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
      >
        Save
      </button>
    </form>
  );
}

export default App;
