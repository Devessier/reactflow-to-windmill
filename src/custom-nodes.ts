import { ActionNode } from "./ActionNode";
import { ConditionNode } from "./ConditionNode";
import { InputNode } from "./InputNode";

export const customNodes = {
  "app-input": InputNode,
  "app-action": ActionNode,
  "app-condition": ConditionNode,
};

export interface InputNodeData {
  type: "input";
  properties: Array<{
    id: string;
    name: string;
    type: "string" | "number";
  }>;
}

export interface ConditionNodeData {
  type: "condition";
  conditions: Array<{ id: string; label: string; expression: string }>;
}

export interface ActionNodeData {
  type: "action";
  actionName?: string;
}

export type CustomNodeData = InputNodeData | ConditionNodeData | ActionNodeData;
