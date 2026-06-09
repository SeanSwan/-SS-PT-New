/**
 * Hermes Command Dispatchers
 * ==========================
 *
 * Sean-only Hermes operator task commands. These remain scalar and card-safe
 * so Swan Coach command results never render raw service objects.
 */

import * as hermesService from '../../hermes/hermesService.mjs';

export const dispatchCreateHermesTask = async (params = {}, ctx = {}) => {
  const task = hermesService.createTask({
    agentType: params.agentType,
    taskTitle: params.taskTitle,
    taskDescription: params.taskDescription,
    priority: params.priority || 'normal',
    requestedBy: ctx.user.id,
  });

  return {
    taskId: task.id,
    agentType: task.agentType,
    taskTitle: task.taskTitle,
    priority: task.priority,
    status: task.status,
    createdAt: task.createdAt,
  };
};

export const dispatchListHermesTasks = async (params = {}) => {
  const result = hermesService.listTasks({
    agentType: params.agentType || undefined,
    status: params.status || undefined,
  });

  return {
    count: result.count,
    pending: result.pending,
    completed: result.completed,
    failed: result.failed,
  };
};
