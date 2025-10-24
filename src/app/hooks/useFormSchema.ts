import { useState, useEffect } from 'react';
import { FormSchema } from '../../types/formSchema';

const STORAGE_KEY = 'esp32-form-schemas';
const ACTIVE_SCHEMA_KEY = 'esp32-active-schema';

export function useFormSchema() {
  const [schemas, setSchemas] = useState<FormSchema[]>([]);
  const [activeSchemaId, setActiveSchemaId] = useState<string>('');

  // Load schemas from localStorage on mount
  useEffect(() => {
    const savedSchemas = localStorage.getItem(STORAGE_KEY);
    const savedActiveId = localStorage.getItem(ACTIVE_SCHEMA_KEY);
    
    if (savedSchemas) {
      try {
        const parsedSchemas = JSON.parse(savedSchemas);
        setSchemas(parsedSchemas);
        
        if (savedActiveId && parsedSchemas.find((s: FormSchema) => s.id === savedActiveId)) {
          setActiveSchemaId(savedActiveId);
        } else if (parsedSchemas.length > 0) {
          setActiveSchemaId(parsedSchemas[0].id);
        }
      } catch (error) {
        console.error('Failed to parse saved schemas:', error);
      }
    }
  }, []);

  // Save schemas to localStorage whenever schemas change
  useEffect(() => {
    if (schemas.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(schemas));
    }
  }, [schemas]);

  // Save active schema ID to localStorage whenever it changes
  useEffect(() => {
    if (activeSchemaId) {
      localStorage.setItem(ACTIVE_SCHEMA_KEY, activeSchemaId);
    }
  }, [activeSchemaId]);

  const saveSchema = (schema: FormSchema) => {
    setSchemas(prev => {
      const existingIndex = prev.findIndex(s => s.id === schema.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = schema;
        return updated;
      } else {
        return [...prev, schema];
      }
    });
  };

  const deleteSchema = (id: string) => {
    setSchemas(prev => prev.filter(s => s.id !== id));
    
    // If we deleted the active schema, switch to another one
    if (activeSchemaId === id) {
      const remainingSchemas = schemas.filter(s => s.id !== id);
      if (remainingSchemas.length > 0) {
        setActiveSchemaId(remainingSchemas[0].id);
      } else {
        setActiveSchemaId('');
      }
    }
  };

  const getActiveSchema = (): FormSchema | null => {
    return schemas.find(s => s.id === activeSchemaId) || null;
  };

  const setActiveSchema = (id: string) => {
    if (schemas.find(s => s.id === id)) {
      setActiveSchemaId(id);
    }
  };

  return {
    schemas,
    activeSchemaId,
    activeSchema: getActiveSchema(),
    saveSchema,
    deleteSchema,
    setActiveSchema,
    getActiveSchema
  };
}
