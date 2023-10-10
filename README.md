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
