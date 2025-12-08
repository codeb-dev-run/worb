"use client";

import React, { useState } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "react-beautiful-dnd";
import { motion, AnimatePresence } from "framer-motion";
import { KanbanCard } from "@/types/project";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface KanbanBoardProps {
  cards: KanbanCard[];
  onCardUpdate: (cards: KanbanCard[]) => void;
  onCardClick?: (card: KanbanCard) => void;
}

const columns = [
  { id: "backlog", title: "백로그", color: "bg-gray-100" },
  { id: "todo", title: "할 일", color: "bg-blue-100" },
  { id: "in_progress", title: "진행 중", color: "bg-yellow-100" },
  { id: "review", title: "검토 중", color: "bg-purple-100" },
  { id: "done", title: "완료", color: "bg-green-100" },
];

export default function KanbanBoard({
  cards,
  onCardUpdate,
  onCardClick,
}: KanbanBoardProps) {
  const [isDraggingOver, setIsDraggingOver] = useState<string | null>(null);

  // 칼럼별로 카드 그룹화
  const cardsByColumn = columns.reduce((acc, column) => {
    acc[column.id] = cards.filter((card) => card.status === column.id);
    return acc;
  }, {} as Record<string, KanbanCard[]>);

  // 드래그 종료 처리
  const handleDragEnd = (result: DropResult) => {
    setIsDraggingOver(null);

    if (!result.destination) return;

    const { source, destination } = result;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    const newCards = [...cards];
    const draggedCard = cards.find((card) => card.id === result.draggableId);

    if (!draggedCard) return;

    // 카드 상태 업데이트
    const updatedCard = {
      ...draggedCard,
      status: destination.droppableId as KanbanCard["status"],
    };

    // 카드 위치 업데이트
    const cardIndex = newCards.findIndex((card) => card.id === draggedCard.id);
    newCards[cardIndex] = updatedCard;

    onCardUpdate(newCards);
  };

  // 우선순위에 따른 색상
  const getPriorityColor = (priority: KanbanCard["priority"]) => {
    switch (priority) {
      case "urgent":
        return "border-red-500 bg-red-50";
      case "high":
        return "border-orange-500 bg-orange-50";
      case "medium":
        return "border-yellow-500 bg-yellow-50";
      case "low":
        return "border-gray-300 bg-white";
      default:
        return "border-gray-300 bg-white";
    }
  };

  // 우선순위 점 표시
  const getPriorityDots = (priority: KanbanCard["priority"]) => {
    const count =
      priority === "urgent"
        ? 4
        : priority === "high"
        ? 3
        : priority === "medium"
        ? 2
        : 1;
    return "•".repeat(count);
  };

  // 체크리스트 진행률 계산
  const getChecklistProgress = (checklist?: KanbanCard["checklist"]) => {
    if (!checklist || checklist.length === 0) return null;
    const completed = checklist.filter((item) => item.completed).length;
    return { completed, total: checklist.length };
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((column) => (
          <div key={column.id} className="flex-shrink-0 w-80">
            {/* 칼럼 헤더 */}
            <div className={`${column.color} rounded-t-lg px-4 py-3`}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">{column.title}</h3>
                <span className="text-sm text-gray-600 font-medium">
                  {cardsByColumn[column.id].length}
                </span>
              </div>
            </div>

            {/* 카드 목록 */}
            <Droppable droppableId={column.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`
                    min-h-[200px] p-2 bg-gray-50 rounded-b-lg
                    ${snapshot.isDraggingOver ? "bg-blue-50" : ""}
                    ${isDraggingOver === column.id ? "ring-2 ring-primary" : ""}
                  `}
                  onDragEnter={() => setIsDraggingOver(column.id)}
                  onDragLeave={() => setIsDraggingOver(null)}>
                  <AnimatePresence>
                    {cardsByColumn[column.id].map((card, index) => (
                      <Draggable
                        key={card.id}
                        draggableId={card.id}
                        index={index}>
                        {(provided, snapshot) => (
                          <motion.div
                            ref={provided.innerRef}
                            {...(provided.draggableProps as any)}
                            {...(provided.dragHandleProps as any)}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className={`
                              mb-2 p-4 rounded-lg border-2 cursor-pointer
                              transition-all duration-200
                              ${getPriorityColor(card.priority)}
                              ${
                                snapshot.isDragging
                                  ? "shadow-lg rotate-3"
                                  : "shadow-sm"
                              }
                              hover:shadow-md
                            `}
                            onClick={() => onCardClick?.(card)}>
                            {/* 우선순위 표시 */}
                            <div className="flex items-center justify-between mb-2">
                              <span
                                className={`
                                text-xs font-bold
                                ${
                                  card.priority === "urgent"
                                    ? "text-red-600"
                                    : card.priority === "high"
                                    ? "text-orange-600"
                                    : card.priority === "medium"
                                    ? "text-yellow-600"
                                    : "text-gray-600"
                                }
                              `}>
                                {getPriorityDots(card.priority)}
                              </span>
                              {card.dueDate && (
                                <span className="text-xs text-gray-600">
                                  {format(new Date(card.dueDate), "MM/dd")}
                                </span>
                              )}
                            </div>

                            {/* 제목 */}
                            <h4 className="font-medium text-gray-900 mb-2">
                              {card.title}
                            </h4>

                            {/* 설명 */}
                            {card.description && (
                              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                                {card.description}
                              </p>
                            )}

                            {/* 라벨 */}
                            {card.labels.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-3">
                                {card.labels.map((label, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded-full">
                                    {label}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* 하단 정보 */}
                            <div className="flex items-center justify-between text-xs text-gray-600">
                              <div className="flex items-center gap-3">
                                {/* 체크리스트 진행률 */}
                                {(() => {
                                  const progress = getChecklistProgress(
                                    card.checklist
                                  );
                                  return progress ? (
                                    <span>
                                      ✓ {progress.completed}/{progress.total}
                                    </span>
                                  ) : null;
                                })()}

                                {/* 첨부파일 */}
                                {card.attachments && card.attachments > 0 && (
                                  <span>📎 {card.attachments}</span>
                                )}

                                {/* 댓글 */}
                                {card.comments && card.comments > 0 && (
                                  <span>💬 {card.comments}</span>
                                )}
                              </div>

                              {/* 담당자 */}
                              {card.assignee && (
                                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white text-xs font-medium">
                                  {card.assignee.charAt(0)}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </Draggable>
                    ))}
                  </AnimatePresence>
                  {provided.placeholder}

                  {/* 빈 칼럼 메시지 */}
                  {cardsByColumn[column.id].length === 0 &&
                    !snapshot.isDraggingOver && (
                      <div className="text-center py-8 text-gray-400">
                        카드를 여기로 드래그하세요
                      </div>
                    )}
                </div>
              )}
            </Droppable>

            {/* 카드 추가 버튼 */}
            <button className="w-full mt-2 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
              + 카드 추가
            </button>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}
