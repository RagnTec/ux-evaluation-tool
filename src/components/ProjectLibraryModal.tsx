import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import type { ProjectSummary } from "../types/project";
import { useI18n } from "../i18n";

interface ProjectLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProjectId: string | null;
  currentProjectName: string;
  projects: ProjectSummary[];
  onSelectProject: (projectId: string) => void;
  onNewProject: () => void;
  onSaveAs: (projectId: string) => void;
  onRenameProject: (projectId: string, newName: string) => void;
  onDeleteProject: (projectId: string) => void;
}

export const ProjectLibraryModal: React.FC<ProjectLibraryModalProps> = ({
  isOpen,
  onClose,
  currentProjectId,
  currentProjectName,
  projects,
  onSelectProject,
  onNewProject,
  onSaveAs,
  onRenameProject,
  onDeleteProject
}) => {
  const { t, locale } = useI18n();
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleStartRename = (projectId: string, currentName: string) => {
    setEditingProjectId(projectId);
    setEditingName(currentName);
  };

  const handleSaveRename = (projectId: string) => {
    const trimmed = editingName.trim();
    if (trimmed) {
      onRenameProject(projectId, trimmed);
    }
    setEditingProjectId(null);
  };

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
    <div className="reportModalOverlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="projectLibraryCard" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="projectLibraryHeader">
          <div>
            <h2 className="projectLibraryTitle">📁 {t("project.library_title")}</h2>
            <p className="projectLibrarySubtitle">{t("project.library_subtitle")}</p>
          </div>
          <div className="projectLibraryHeaderActions">
            <button
              type="button"
              className="projectNewBtn"
              onClick={() => {
                onNewProject();
                onClose();
              }}
            >
              + {t("project.new_project")}
            </button>
            <button type="button" className="reportModalCloseBtn" onClick={onClose} aria-label={t("action.close")}>
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="projectLibraryBody">
          {/* Current Active Project Banner */}
          {currentProjectId && (
            <div className="currentProjectCard">
              <div className="currentProjectBadge">{t("project.current_badge")}</div>
              <div className="currentProjectInfo">
                <span className="currentProjectName">{currentProjectName}</span>
                <span className="currentProjectMeta">ID: {currentProjectId.substring(0, 8)}…</span>
              </div>
              <div className="currentProjectActions">
                <button
                  type="button"
                  className="projectActionBtn"
                  onClick={() => onSaveAs(currentProjectId)}
                  title={t("project.save_as_hint")}
                >
                  📄 {t("project.save_as")}
                </button>
              </div>
            </div>
          )}

          {/* Project List */}
          <div className="projectListSection">
            <h3 className="projectSectionHeading">
              {t("project.recent_projects")} ({projects.length})
            </h3>

            {projects.length === 0 ? (
              <div className="projectEmptyState">
                <p>{t("project.no_projects")}</p>
              </div>
            ) : (
              <div className="projectListContainer">
                {projects.map((p) => {
                  const isCurrent = p.project_id === currentProjectId;
                  return (
                    <div
                      key={p.project_id}
                      className={`projectItemRow ${isCurrent ? "activeProject" : ""}`}
                    >
                      <div className="projectItemLeft">
                        {editingProjectId === p.project_id ? (
                          <div className="projectRenameBox">
                            <input
                              type="text"
                              className="projectRenameInput"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveRename(p.project_id);
                                if (e.key === "Escape") setEditingProjectId(null);
                              }}
                              autoFocus
                            />
                            <button
                              type="button"
                              className="projectRenameConfirmBtn"
                              onClick={() => handleSaveRename(p.project_id)}
                            >
                              ✓
                            </button>
                            <button
                              type="button"
                              className="projectRenameCancelBtn"
                              onClick={() => setEditingProjectId(null)}
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="projectItemTitleRow">
                            <span className="projectNameText">{p.project_name || t("project.default_name")}</span>
                            {isCurrent && <span className="currentMiniTag">{t("project.current_tag")}</span>}
                          </div>
                        )}

                        <div className="projectItemDetails">
                          {p.image_name && <span className="projectDetailTag">🖼️ {p.image_name}</span>}
                          {p.image_width && p.image_height && (
                            <span className="projectDetailTag">
                              {p.image_width} × {p.image_height} px
                            </span>
                          )}
                          <span className="projectDetailTag">
                            🏷️ {t("project.element_count_tag", { count: p.element_count })}
                          </span>
                          <span className="projectDateTag">🕒 {formatDate(p.updated_at)}</span>
                        </div>
                      </div>

                      <div className="projectItemActions">
                        {!isCurrent ? (
                          <button
                            type="button"
                            className="projectOpenBtn"
                            onClick={() => {
                              onSelectProject(p.project_id);
                              onClose();
                            }}
                          >
                            {t("project.open_project")}
                          </button>
                        ) : (
                          <span className="projectCurrentActiveNotice">{t("project.currently_open")}</span>
                        )}

                        <button
                          type="button"
                          className="projectIconBtn"
                          onClick={() => handleStartRename(p.project_id, p.project_name)}
                          title={t("action.edit")}
                        >
                          ✏️
                        </button>

                        <button
                          type="button"
                          className="projectIconBtn"
                          onClick={() => onSaveAs(p.project_id)}
                          title={t("project.save_as")}
                        >
                          📄
                        </button>

                        <button
                          type="button"
                          className="projectIconBtn danger"
                          onClick={() => {
                            const confirmMsg = t("project.delete_confirm", { name: p.project_name });
                            if (window.confirm(confirmMsg)) {
                              onDeleteProject(p.project_id);
                            }
                          }}
                          title={t("action.delete")}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="projectLibraryFooter">
          <button type="button" className="reportModalCancelBtn" onClick={onClose}>
            {t("action.close")}
          </button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};
