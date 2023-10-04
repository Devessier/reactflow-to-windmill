import { memo } from "react";
import { Handle, NodeProps, Position } from "reactflow";
import { CustomNodeBase } from "./CustomNodeBase";

export const InputNode = memo((props: NodeProps) => {
  return (
    <CustomNodeBase isFocused={props.selected}>
      <div className="px-4 py-2">Input</div>
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={props.isConnectable}
      />
    </CustomNodeBase>
  );
});
