import { ActionNode } from "./ActionNode";
import { ConditionNode } from "./ConditionNode";
import { InputNode } from "./InputNode";

export const customNodes = {
  "app-input": InputNode,
  "app-action": ActionNode,
  "app-condition": ConditionNode,
};

export interface InputProperty {
  id: string;
  name: string;
  type: "string" | "number";
  required: boolean;
}

export interface InputNodeData {
  type: "input";
  properties: Array<InputProperty>;
}

export interface ConditionNodeData {
  type: "condition";
  conditions: Array<{ id: string; label: string; expression: string }>;
}

export interface ActionInput {
  id: string;
  parameter: string;
  expression: string;
}

export interface ActionNodeData {
  type: "action";
  actionName?: string;
  inputs: Array<ActionInput>;
}

export type CustomNodeData = InputNodeData | ConditionNodeData | ActionNodeData;
