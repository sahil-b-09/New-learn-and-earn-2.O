
import React from 'react';
import { CheckCircle } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Module, UserProgress } from '@/types/course';

interface ModulesListProps {
  modules: Module[];
  userProgress: UserProgress[];
  activeModuleId: string | null;
  onSelectModule: (module: Module) => void;
}

const ModulesList: React.FC<ModulesListProps> = ({
  modules,
  userProgress,
  activeModuleId,
  onSelectModule
}) => {
  // Function to check if a module is completed
  const isModuleCompleted = (moduleId: string) => {
    return userProgress.some(p => p.module_id === moduleId && p.completed);
  };
  
  return (
    <Accordion type="single" defaultValue={activeModuleId || undefined} collapsible className="w-full">
      {modules.map((module) => {
        const completed = isModuleCompleted(module.id);
        const isActive = activeModuleId === module.id;
        
        return (
          <AccordionItem 
            key={module.id} 
            value={module.id}
            className={`${completed ? 'bg-green-50 border-green-100' : ''} 
                        ${isActive ? 'border-l-4 border-l-blue-500 pl-2' : ''} 
                        rounded-md mb-1`}
          >
            <AccordionTrigger className="py-2 px-1 hover:no-underline">
              <div className="flex items-center gap-2 text-left">
                {completed ? (
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                ) : (
                  <div className={`h-4 w-4 rounded-full border ${isActive ? 'border-blue-500 bg-blue-100' : 'border-gray-300'} flex-shrink-0`} />
                )}
                <span className={`text-sm ${completed ? 'text-green-700' : 'text-gray-700'} ${isActive ? 'font-medium' : ''}`}>
                  {module.title}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-xs text-gray-600 pl-6">
              {module.description && <p className="mb-2">{module.description}</p>}
              <button 
                className="text-blue-600 hover:underline font-medium text-left"
                onClick={() => onSelectModule(module)}
              >
                View Module
              </button>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
};

export default ModulesList;
