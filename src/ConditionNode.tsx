import { memo } from "react";
import { Handle, NodeProps, Position } from "reactflow";
import { CustomNodeBase } from "./CustomNodeBase";
import { ConditionNodeData } from "./custom-nodes";

export const ConditionNode = memo((props: NodeProps<ConditionNodeData>) => {
  const sources = [
    { id: "default", label: "Default Branch" },
    ...props.data.conditions.map((condition) => ({
      id: condition.id,
      label: condition.label,
    })),
  ];

  return (
    <CustomNodeBase isFocused={props.selected}>
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={props.isConnectable}
      />

      <div className="px-4 py-2 text-center">Condition</div>

      <div className="flex border-t border-t-slate-300 pt-2">
        {sources.map((target, index) => (
          <div
            key={index}
            className="relative px-8 grow"
          >
            <p className="font-semibold text-center mb-2">{target.label}</p>

            <Handle
              type="source"
              position={Position.Bottom}
              id={target.id}
              isConnectable={props.isConnectable}
            />
          </div>
        ))}
      </div>
    </CustomNodeBase>
  );
});
