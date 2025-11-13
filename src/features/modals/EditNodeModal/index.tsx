import React, { useState, useEffect } from "react";
import type { ModalProps } from "@mantine/core";
import {
  Modal,
  Stack,
  Text,
  TextInput,
  Button,
  Flex,
  CloseButton,
  Group,
  Alert,
  Textarea,
} from "@mantine/core";
import { MdWarning } from "react-icons/md";
import type { NodeData } from "../../../types/graph";
import useGraph from "../../editor/views/GraphView/stores/useGraph";
import useJson from "../../../store/useJson";
import useFile from "../../../store/useFile";

export const EditNodeModal = ({ opened, onClose }: ModalProps) => {
  const nodeData = useGraph(state => state.selectedNode);
  const editNode = useGraph(state => state.editNode);
  const json = useJson(state => state.json);
  const setJson = useJson(state => state.setJson);

  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (opened && nodeData) {
      const values: Record<string, string> = {};
      nodeData.text.forEach(row => {
        if (row.type !== "array" && row.type !== "object") {
          const key = row.key ?? "value";
          values[key] = String(row.value);
        }
      });
      setEditValues(values);
      setError(null);
    }
  }, [opened, nodeData]);

  const handleValueChange = (key: string, value: string) => {
    setEditValues(prev => ({ ...prev, [key]: value }));
    setError(null);
  };

  const handleSave = async () => {
    if (!nodeData) return;

    try {
      setIsSubmitting(true);
      setError(null);

      // Get all the edited values
      const editableRows = nodeData.text.filter(row => row.type !== "array" && row.type !== "object");
      
      // Build the updated values for just the editable fields
      const editedFieldsUpdate: Record<string, any> = {};
      editableRows.forEach(row => {
        const key = row.key ?? "value";
        const newValueStr = editValues[key];
        let newValue: any = newValueStr;
        try {
          newValue = JSON.parse(newValueStr);
        } catch {
          newValue = newValueStr;
        }
        editedFieldsUpdate[key] = newValue;
      });

      // Update the JSON with the new values
      try {
        const obj = JSON.parse(json);
        const originalObj = JSON.parse(json); // Keep a copy for comparison
        
        const path = nodeData.path || [];
        
        // Navigate to the node
        let current = obj;
        for (let i = 0; i < path.length; i++) {
          current = current[path[i]];
        }
        
        // Validate that we're updating the right type of node
        if (current && typeof current === "object" && !Array.isArray(current)) {
          // For objects, merge to preserve nested properties
          const originalCurrent = originalObj;
          let origRef = originalCurrent;
          for (let i = 0; i < path.length; i++) {
            origRef = origRef[path[i]];
          }
          
          // Safety check: only merge if the original had the same structure
          if (origRef && typeof origRef === "object" && !Array.isArray(origRef)) {
            Object.assign(current, editedFieldsUpdate);
          } else {
            throw new Error("Structure mismatch - cannot safely update");
          }
        } else if (editableRows.length === 1 && !editableRows[0].key) {
          // Single value node - replace directly
          let parent = obj;
          for (let i = 0; i < path.length - 1; i++) {
            parent = parent[path[i]];
          }
          if (path.length > 0) {
            parent[path[path.length - 1]] = editedFieldsUpdate[editableRows[0].key ?? "value"];
          } else {
            Object.assign(obj, editedFieldsUpdate);
          }
        }
        
        const updatedJson = JSON.stringify(obj, null, 2);
        
        // Validate the updated JSON is valid
        JSON.parse(updatedJson);
        
        // Use setContents to properly update both stores
        useFile.getState().setContents({ contents: updatedJson, skipUpdate: false });
      } catch (err) {
        console.error("Save error:", err);
        throw new Error(`Failed to update JSON: ${err instanceof Error ? err.message : "Unknown error"}`);
      }

      setIsSubmitting(false);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes");
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setEditValues({});
    setError(null);
    onClose();
  };

  if (!nodeData) return null;

  const editableFields = nodeData.text.filter(row => row.type !== "array" && row.type !== "object");

  return (
    <Modal size="sm" opened={opened} onClose={handleCancel} centered withCloseButton={false}>
      <Stack pb="sm" gap="md">
        <Flex justify="space-between" align="center">
          <Text fz="md" fw={600}>
            Edit Node
          </Text>
          <CloseButton onClick={handleCancel} />
        </Flex>

        {error && (
          <Alert icon={<MdWarning size={16} />} color="red" title="Error">
            {error}
          </Alert>
        )}

        <Stack gap="sm">
          {editableFields.map((row, index) => {
            const key = row.key ?? "value";
            const isMultiline = String(row.value).length > 50;

            return (
              <div key={`${nodeData.id}-${index}`}>
                <Text fz="xs" fw={500} mb="xs">
                  {key}
                </Text>
                {isMultiline ? (
                  <Textarea
                    value={editValues[key] || ""}
                    onChange={e => handleValueChange(key, e.currentTarget.value)}
                    placeholder={`Enter ${key} value`}
                    minRows={3}
                    maxRows={8}
                  />
                ) : (
                  <TextInput
                    value={editValues[key] || ""}
                    onChange={e => handleValueChange(key, e.currentTarget.value)}
                    placeholder={`Enter ${key} value`}
                  />
                )}
              </div>
            );
          })}
        </Stack>

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={handleCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSave} loading={isSubmitting}>
            Save
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
