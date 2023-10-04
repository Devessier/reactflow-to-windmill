import { memo } from "react";
import { Handle, NodeProps, Position } from "reactflow";
import { CustomNodeBase } from "./CustomNodeBase";

export const ActionNode = memo((props: NodeProps) => {
  return (
    <CustomNodeBase isFocused={props.selected}>
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={props.isConnectable}
      />
      <div className="px-4 py-2">Action</div>
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={props.isConnectable}
      />
    </CustomNodeBase>
  );
});
