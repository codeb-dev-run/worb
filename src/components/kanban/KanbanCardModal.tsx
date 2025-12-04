"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { KanbanCard, ChecklistItem } from "@/types/project";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useWorkspace, LEGACY_DEPARTMENT_MAP } from "@/lib/workspace-context";
import { Check, AlertCircle } from "lucide-react";

interface KanbanCardModalProps {
  card: KanbanCard | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (card: KanbanCard) => void;
  onDelete: (cardId: string) => void;
}

export default function KanbanCardModal({
  card,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
}: KanbanCardModalProps) {
  const { departments } = useWorkspace();
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    title: card?.title || "",
    description: card?.description || "",
    priority: card?.priority || ("medium" as const),
    assignee: card?.assignee || "",
    dueDate: card?.dueDate ? format(card.dueDate, "yyyy-MM-dd") : "",
    labels: card?.labels.join(", ") || "",
    department: card?.department || "",
  });
  const [newChecklistItem, setNewChecklistItem] = useState("");

  if (!card || !isOpen) return null;

  const handleSave = () => {
    const updatedCard: KanbanCard = {
      ...card,
      title: formData.title,
      description: formData.description,
      priority: formData.priority,
      assignee: formData.assignee,
      dueDate: formData.dueDate ? new Date(formData.dueDate) : undefined,
      labels: formData.labels
        .split(",")
        .map((l) => l.trim())
        .filter((l) => l),
      department: formData.department,
    };
    onUpdate(updatedCard);
    setEditMode(false);
  };

  const handleChecklistToggle = (itemId: string) => {
    if (!card.checklist) return;

    const updatedChecklist = card.checklist.map((item) =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );

    onUpdate({ ...card, checklist: updatedChecklist });
  };

  const handleAddChecklistItem = () => {
    if (!newChecklistItem.trim()) return;

    const newItem: ChecklistItem = {
      id: `check-${Date.now()}`,
      text: newChecklistItem.trim(),
      completed: false,
    };

    const updatedChecklist = [...(card.checklist || []), newItem];
    onUpdate({ ...card, checklist: updatedChecklist });
    setNewChecklistItem("");
  };

  const handleDeleteChecklistItem = (itemId: string) => {
    if (!card.checklist) return;

    const updatedChecklist = card.checklist.filter(
      (item) => item.id !== itemId
    );
    onUpdate({ ...card, checklist: updatedChecklist });
  };

  const getChecklistProgress = () => {
    if (!card.checklist || card.checklist.length === 0) return 0;
    const completed = card.checklist.filter((item) => item.completed).length;
    return Math.round((completed / card.checklist.length) * 100);
  };

  const getPriorityColor = (priority: KanbanCard["priority"]) => {
    switch (priority) {
      case "urgent":
        return "text-red-600 bg-red-100";
      case "high":
        return "text-orange-600 bg-orange-100";
      case "medium":
        return "text-yellow-600 bg-yellow-100";
      case "low":
        return "text-gray-600 bg-gray-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  // 현재 선택된 부서 정보 가져오기 (워크스페이스 departments 또는 레거시 fallback)
  const departmentKey = editMode ? formData.department : card.department;
  const currentDepartment =
    departments.find((d) => d.id === departmentKey) ||
    (departmentKey && LEGACY_DEPARTMENT_MAP[departmentKey]
      ? {
          id: departmentKey,
          name: LEGACY_DEPARTMENT_MAP[departmentKey].name,
          color: LEGACY_DEPARTMENT_MAP[departmentKey].color,
        }
      : null);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center p-4 overflow-y-auto"
        onClick={onClose}>
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="bg-white rounded-xl w-full max-w-2xl my-8 max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}>
          {/* 헤더 */}
          <div className="flex items-center justify-between p-6 border-b shrink-0">
            <div className="flex items-center gap-3">
              <span
                className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(
                  card.priority
                )}`}>
                {card.priority.toUpperCase()}
              </span>
              {currentDepartment && (
                <span
                  className="px-2 py-1 text-xs font-medium rounded-full text-white"
                  style={{ backgroundColor: currentDepartment.color }}>
                  {currentDepartment.name}
                </span>
              )}
              {card.dueDate && (
                <span className="text-sm text-gray-600">
                  📅 {format(card.dueDate, "yyyy년 MM월 dd일", { locale: ko })}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditMode(!editMode)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="수정">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>

              <button
                onClick={() => {
                  if (confirm("이 카드를 삭제하시겠습니까?")) {
                    onDelete(card.id);
                    onClose();
                  }
                }}
                className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                title="삭제">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>

              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="닫기">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6 overflow-y-auto flex-1">
            {/* 제목 */}
            <div>
              {editMode ? (
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="text-xl font-semibold w-full border-none outline-none focus:ring-2 focus:ring-primary rounded-lg px-2 py-1"
                  placeholder="카드 제목"
                />
              ) : (
                <h2 className="text-xl font-semibold text-gray-900">
                  {card.title}
                </h2>
              )}
            </div>

            {/* 설명 */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">설명</h3>
              {editMode ? (
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  rows={4}
                  placeholder="카드 설명을 입력하세요..."
                />
              ) : (
                <p className="text-gray-600 bg-gray-50 p-3 rounded-lg">
                  {card.description || "설명이 없습니다."}
                </p>
              )}
            </div>

            {/* 메타 정보 편집 */}
            {editMode && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    우선순위
                  </label>
                  <div className="flex gap-2">
                    {[
                      {
                        value: "low",
                        label: "낮음",
                        activeStyle:
                          "bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500",
                      },
                      {
                        value: "medium",
                        label: "보통",
                        activeStyle:
                          "bg-lime-100 text-lime-700 ring-2 ring-lime-500",
                      },
                      {
                        value: "high",
                        label: "높음",
                        activeStyle:
                          "bg-amber-100 text-amber-700 ring-2 ring-amber-500",
                      },
                      {
                        value: "urgent",
                        label: "긴급",
                        activeStyle:
                          "bg-rose-100 text-rose-700 ring-2 ring-rose-500",
                      },
                    ].map((priority) => (
                      <button
                        key={priority.value}
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            priority: priority.value as any,
                          })
                        }
                        className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                          formData.priority === priority.value
                            ? priority.activeStyle
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}>
                        {priority.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      담당자
                    </label>
                    <input
                      type="text"
                      value={formData.assignee}
                      onChange={(e) =>
                        setFormData({ ...formData, assignee: e.target.value })
                      }
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                      placeholder="담당자 이름"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      마감일
                    </label>
                    <input
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) =>
                        setFormData({ ...formData, dueDate: e.target.value })
                      }
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    라벨
                  </label>
                  <input
                    type="text"
                    value={formData.labels}
                    onChange={(e) =>
                      setFormData({ ...formData, labels: e.target.value })
                    }
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                    placeholder="라벨을 쉼표로 구분"
                  />
                </div>

                {/* 부서 선택 (클릭형 UI) - 워크스페이스 departments 또는 레거시 부서 사용 */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    부서
                  </label>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() =>
                        setFormData({ ...formData, department: "" })
                      }
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                        !formData.department
                          ? "bg-gray-800 text-white shadow-md"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}>
                      선택 안함
                    </button>
                    {/* 워크스페이스에 부서가 있으면 해당 부서 표시 */}
                    {departments.length > 0
                      ? departments.map((dept) => (
                          <button
                            key={dept.id}
                            onClick={() =>
                              setFormData({ ...formData, department: dept.id })
                            }
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1 ${
                              formData.department === dept.id
                                ? "text-white shadow-md ring-2 ring-offset-1 ring-gray-200"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                            style={{
                              backgroundColor:
                                formData.department === dept.id
                                  ? dept.color
                                  : undefined,
                            }}>
                            {dept.name}
                            {formData.department === dept.id && (
                              <Check className="w-3 h-3 ml-1" />
                            )}
                          </button>
                        ))
                      : /* 부서가 없으면 레거시 부서 옵션 표시 */
                        Object.entries(LEGACY_DEPARTMENT_MAP).map(
                          ([key, dept]) => (
                            <button
                              key={key}
                              onClick={() =>
                                setFormData({ ...formData, department: key })
                              }
                              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1 ${
                                formData.department === key
                                  ? "text-white shadow-md ring-2 ring-offset-1 ring-gray-200"
                                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                              }`}
                              style={{
                                backgroundColor:
                                  formData.department === key
                                    ? dept.color
                                    : undefined,
                              }}>
                              {dept.name}
                              {formData.department === key && (
                                <Check className="w-3 h-3 ml-1" />
                              )}
                            </button>
                          )
                        )}
                  </div>
                  {/* 부서가 없을 때 안내 메시지 */}
                  {departments.length === 0 && (
                    <p className="mt-2 text-xs text-amber-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      워크스페이스 설정에서 부서를 추가하면 더 정확한 관리가
                      가능합니다.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* 라벨 표시 */}
            {!editMode && card.labels.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">라벨</h3>
                <div className="flex flex-wrap gap-2">
                  {card.labels.map((label, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 체크리스트 */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-700">
                  체크리스트{" "}
                  {card.checklist && card.checklist.length > 0 && (
                    <span className="text-xs text-gray-500">
                      ({getChecklistProgress()}% 완료)
                    </span>
                  )}
                </h3>
              </div>

              {/* 진행률 바 */}
              {card.checklist && card.checklist.length > 0 && (
                <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${getChecklistProgress()}%` }}
                  />
                </div>
              )}

              {/* 체크리스트 아이템들 */}
              {card.checklist && card.checklist.length > 0 && (
                <div className="space-y-2 mb-4">
                  {card.checklist.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 group">
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={() => handleChecklistToggle(item.id)}
                        className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
                      />
                      <span
                        className={`flex-1 ${
                          item.completed
                            ? "line-through text-gray-500"
                            : "text-gray-900"
                        }`}>
                        {item.text}
                      </span>
                      <button
                        onClick={() => handleDeleteChecklistItem(item.id)}
                        className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* 체크리스트 아이템 추가 */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                  onKeyPress={(e) =>
                    e.key === "Enter" && handleAddChecklistItem()
                  }
                  className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary text-sm"
                  placeholder="새 체크리스트 항목 추가..."
                />
                <button
                  onClick={handleAddChecklistItem}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                  추가
                </button>
              </div>
            </div>

            {/* 메타 정보 */}
            {!editMode && (
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <span className="text-sm text-gray-600">담당자</span>
                  <p className="font-medium">{card.assignee || "미지정"}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">첨부파일</span>
                  <p className="font-medium">{card.attachments || 0}개</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">댓글</span>
                  <p className="font-medium">{card.comments || 0}개</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">상태</span>
                  <p className="font-medium capitalize">
                    {card.status.replace("_", " ")}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 하단 버튼 */}
          {editMode && (
            <div className="flex gap-3 p-6 border-t shrink-0">
              <button
                onClick={() => {
                  setEditMode(false);
                  setFormData({
                    title: card.title,
                    description: card.description,
                    priority: card.priority,
                    assignee: card.assignee || "",
                    dueDate: card.dueDate
                      ? format(card.dueDate, "yyyy-MM-dd")
                      : "",
                    labels: card.labels.join(", "),
                    department: card.department || "",
                  });
                }}
                className="btn btn-secondary flex-1">
                취소
              </button>
              <button onClick={handleSave} className="btn btn-primary flex-1">
                저장
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
