import React, { useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { getDefinition, type ContextualDefinition } from "../content/definitionRegistry";
import { useI18n } from "../i18n";

interface DefinitionDialogProps {
  termId: string | null;
  onClose: () => void;
  onViewEvidence?: (referenceId: string) => void;
}

export const DefinitionDialog: React.FC<DefinitionDialogProps> = ({
  termId,
  onClose,
  onViewEvidence
}) => {
  const { t, locale } = useI18n();
  const dialogRef = useRef<HTMLDivElement>(null);
  const def: ContextualDefinition | undefined = termId ? getDefinition(termId) : undefined;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    if (termId) {
      document.addEventListener("keydown", handleKeyDown);
      dialogRef.current?.focus();
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [termId, onClose]);

  if (!termId || !def) return null;

  const content = (
    <div
      className="definitionModalOverlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="definition-dialog-title"
    >
      <div
        className="definitionModalCard"
        ref={dialogRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="definitionModalHeader">
          <div className="definitionModalTitleArea">
            <span className="definitionModalBadge">{t("dialog.definition_title")}</span>
            <h3 id="definition-dialog-title" className="definitionModalTitle">
              {locale === "en" && def.english_label ? def.english_label : def.label} {locale !== "en" && def.english_label ? `(${def.english_label})` : ""}
            </h3>
          </div>
          <button
            className="definitionModalCloseBtn"
            onClick={onClose}
            aria-label={t("action.close")}
          >
            ✕
          </button>
        </div>

        <div className="definitionModalBody">
          <div className="definitionSection">
            <p className="definitionText">{def.plain_definition}</p>
          </div>

          {def.why_it_matters && (
            <div className="definitionSection">
              <h4 className="definitionSectionTitle">{t("dialog.definition_why_it_matters")}</h4>
              <p className="definitionText">{def.why_it_matters}</p>
            </div>
          )}

          {def.caution && (
            <div className="definitionSection caution">
              <h4 className="definitionSectionTitle">{t("dialog.definition_caution")}</h4>
              <p className="definitionText">{def.caution}</p>
            </div>
          )}

          {def.reference_id && (
            <div className="definitionSection reference">
              <h4 className="definitionSectionTitle">{locale === "en" ? "Standards & References" : "标准与依据"}</h4>
              <p className="definitionRef">
                {locale === "en" ? "Reference ID: " : "依据编号："}<code>{def.reference_id}</code> {def.reference_label ? `— ${def.reference_label}` : ""}
              </p>
              {onViewEvidence && (
                <button
                  className="definitionEvidenceBtn"
                  onClick={() => {
                    onViewEvidence(def.reference_id!);
                    onClose();
                  }}
                >
                  {locale === "en" ? "View evidence details →" : "查看相关依据详情 →"}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="definitionModalFooter">
          <button className="definitionModalPrimaryBtn" onClick={onClose}>
            {locale === "en" ? "Got it" : "了解并返回"}
          </button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(content, document.body);
};
