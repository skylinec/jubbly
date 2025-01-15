import React, { useState } from 'react';
import { Modal, Form, Button, ListGroup } from 'react-bootstrap';
import { toast } from 'react-toastify';

interface FilterConfig {
  id: number;
  name: string;
  config: string;
}

interface FilterOption {
  value: string;
  label: string;
  type: string;
}

interface SavedFilterConfig {
  filters: FilterOption[];
  dateRange: [Date | undefined, Date | undefined];
  hideNegativeOutcomes: boolean; // Updated name
  selectedStages: Array<{ value: string; label: string } | string>;
  searchQuery?: string;
}

interface FilterConfigModalProps {
    show: boolean;
    onHide: () => void;
    filterConfigs: FilterConfig[];
    onSave: (name: string, config: any) => Promise<void>;
    onDelete: (id: number) => Promise<void>;
    onLoad: (config: any) => void; // Add this line
    currentConfig: {
      filters: any[];
      dateRange: [Date | undefined, Date | undefined];
      hideNegativeOutcomes: boolean; // Updated name
      selectedStages: string[];
      searchQuery?: string;
    };
  }

  const FilterConfigModal: React.FC<FilterConfigModalProps> = ({
    show,
    onHide,
    filterConfigs,
    onSave,
    onDelete,
    onLoad, // Add this line
    currentConfig
  }) => {
  const [newConfigName, setNewConfigName] = useState('');
  const [selectedConfig, setSelectedConfig] = useState<FilterConfig | null>(null);

  const handleSave = async () => {
    if (!newConfigName.trim()) {
      toast.error('Please enter a configuration name');
      return;
    }

    try {
      await onSave(newConfigName, currentConfig);
      setNewConfigName('');
      setSelectedConfig(null);
      toast.success('Filter configuration saved successfully');
    } catch (error) {
      toast.error('Failed to save filter configuration');
    }
  };

  const handleOverwrite = async () => {
    if (!selectedConfig) {
      toast.error('Please select a configuration to overwrite');
      return;
    }

    try {
      await onSave(selectedConfig.name, currentConfig);
      toast.success('Filter configuration updated successfully');
    } catch (error) {
      toast.error('Failed to update filter configuration');
    }
  };

  const handleDelete = async (config: FilterConfig) => {
    try {
      await onDelete(config.id);
      setSelectedConfig(null);
      toast.success('Filter configuration deleted successfully');
    } catch (error) {
      toast.error('Failed to delete filter configuration');
    }
  };

  const handleLoad = (config: FilterConfig) => {
    try {
      // Handle both string and object configs
      const parsedConfig = typeof config.config === 'string' 
        ? JSON.parse(config.config)
        : config.config;

      console.log('Raw parsed config:', parsedConfig);

      // Convert snake_case to camelCase for consistency
      const normalizedConfig = {
        filters: parsedConfig.filters || [],
        dateRange: parsedConfig.date_range || parsedConfig.dateRange || [null, null],
        hideNegativeOutcomes: parsedConfig.hide_negative_outcomes ?? parsedConfig.hideNegativeOutcomes ?? false, // Updated name
        selectedStages: parsedConfig.selected_stages || parsedConfig.selectedStages || [],
        searchQuery: parsedConfig.search_query || parsedConfig.searchQuery || ''
      };

      // Transform selectedStages into proper format - ensure we're using only strings
      const processedStages = normalizedConfig.selectedStages.map((stage: any) => {
        if (typeof stage === 'object' && 'value' in stage) {
          return stage.value;
        }
        return String(stage);
      });

      const savedConfig: SavedFilterConfig = {
        filters: normalizedConfig.filters.map((filter: any) => ({
          value: String(filter.value || ''),
          label: String(filter.label || filter.value || ''),
          type: String(filter.type || '')
        })),
        dateRange: [
          normalizedConfig.dateRange[0] ? new Date(normalizedConfig.dateRange[0]) : undefined,
          normalizedConfig.dateRange[1] ? new Date(normalizedConfig.dateRange[1]) : undefined
        ],
        hideNegativeOutcomes: Boolean(normalizedConfig.hideNegativeOutcomes), // Updated name
        selectedStages: processedStages, // Now it's an array of strings
        searchQuery: String(normalizedConfig.searchQuery)
      };

      console.log('Sending to context:', savedConfig);
      onLoad(savedConfig);
      onHide();
    } catch (error) {
      console.error('Error transforming config:', error);
      console.error('Problematic config:', config);
      toast.error('Failed to load filter configuration');
    }
  };

  return (
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>Filter Configurations</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Save New Configuration</Form.Label>
            <div className="d-flex">
              <Form.Control
                type="text"
                placeholder="Enter configuration name"
                value={newConfigName}
                onChange={(e) => setNewConfigName(e.target.value)}
              />
              <Button variant="primary" className="ms-2" onClick={handleSave}>
                Save
              </Button>
            </div>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Existing Configurations</Form.Label>
            <ListGroup>
              {filterConfigs.map((config) => (
                <ListGroup.Item
                  key={config.id}
                  active={selectedConfig?.id === config.id}
                  onClick={() => setSelectedConfig(config)}
                  className="d-flex justify-content-between align-items-center"
                >
                  <span>{config.name}</span>
                  <div>
                    <Button
                      variant="danger"
                      size="sm"
                      className="me-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(config);
                      }}
                    >
                      Delete
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLoad(config); // Pass the config directly
                      }}
                    >
                      Load
                    </Button>
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
        <Button
          variant="warning"
          onClick={handleOverwrite}
          disabled={!selectedConfig}
        >
          Overwrite Selected
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default FilterConfigModal;
