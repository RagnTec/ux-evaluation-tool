import React, { useState } from "react";
import { getDefinition } from "../content/definitionRegistry";
import { DefinitionDialog } from "./DefinitionDialog";

interface DefinitionTermProps {
  termId: string;
  children?: React.ReactNode;
  showIcon?: boolean;
  className?: string;
  onViewEvidence?: (referenceId: string) => void;
}

export const DefinitionTerm: React.FC<DefinitionTermProps> = ({
  termId,
  children,
  showIcon = true,
  className = "",
  onViewEvidence
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const def = getDefinition(termId);

  if (!def) {
    return <span className={className}>{children || termId}</span>;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDialogOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation();
      setIsDialogOpen(true);
    }
  };

  return (
    <>
      <span
        className={`definitionTermTrigger ${className}`}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        title={`${def.label}：${def.plain_definition} (点击查看完整人因与标准说明)`}
      >
        <span className="definitionTermText">{children || def.label}</span>
        {showIcon && <span className="definitionTermIcon" aria-hidden="true">ⓘ</span>}
      </span>

      {isDialogOpen && (
        <DefinitionDialog
          termId={termId}
          onClose={() => setIsDialogOpen(false)}
          onViewEvidence={onViewEvidence}
        />
      )}
    </>
  );
};
