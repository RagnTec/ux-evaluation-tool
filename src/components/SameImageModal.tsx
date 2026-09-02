import React from "react";
import ReactDOM from "react-dom";
import type { LocalProject } from "../types/project";
import { useI18n } from "../i18n";

interface SameImageModalProps {
  isOpen: boolean;
  matchingProjects: LocalProject[];
  onContinueProject: (projectId: string) => void;
  onStartNewWithImage: () => void;
  onCancel: () => void;
}

export const SameImageModal: React.FC<SameImageModalProps> = ({
  isOpen,
  matchingProjects,
  onContinueProject,
  onStartNewWithImage,
  onCancel
}) => {
  const { t, locale } = useI18n();

  if (!isOpen || matchingProjects.length === 0) return null;

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleString(locale === "en" ? "en-US" : "zh-CN", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return isoString;
    }
  };

  const modalContent = (
    <div className="reportModalOverlay" onClick={onCancel} role="dialog" aria-modal="true">
      <div className="sameImageModalCard" onClick={(e) => e.stopPropagation()}>
        <div className="sameImageHeader">
          <div className="sameImageIconBadge">🔍</div>
          <div>
            <h3 className="sameImageTitle">{t("same_image.title")}</h3>
            <p className="sameImageSubtitle">{t("same_image.subtitle")}</p>
          </div>
        </div>

        <div className="sameImageListContainer">
          <div className="sameImageListHeader">
            {t("same_image.found_records", { count: matchingProjects.length })}:
          </div>
          <div className="sameImageList">
            {matchingProjects.map((p) => {
              const elementCount = Array.isArray(p.workspace?.elements) ? p.workspace.elements.length : 0;
              return (
                <div key={p.project_id} className="sameImageItem">
                  <div className="sameImageItemInfo">
                    <span className="sameImageItemName">{p.project_name}</span>
                    <div className="sameImageItemMeta">
                      <span>🏷️ {t("project.element_count_tag", { count: elementCount })}</span>
                      <span>🕒 {formatDate(p.updated_at)}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="sameImageContinueBtn"
                    onClick={() => onContinueProject(p.project_id)}
                  >
                    {t("same_image.continue_btn")}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="sameImageFooter">
          <button type="button" className="sameImageCancelBtn" onClick={onCancel}>
            {t("action.cancel")}
          </button>
          <button
            type="button"
            className="sameImageNewBtn"
            onClick={onStartNewWithImage}
          >
            {t("same_image.start_new_btn")}
          </button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};
