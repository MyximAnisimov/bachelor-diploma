package com.example.demo.service;

import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class ElementLockService {


    private final Map<UUID, Map<Long, String>> locks = new ConcurrentHashMap<>();

    /**
     * Попытаться залочить набор элементов.
     * @return true, если все элементы либо были свободны, либо уже залочены этим же clientId.
     *         false, если хотя бы один элемент залочен другим клиентом (в этом случае НИЧЕГО не меняем).
     */
    public synchronized boolean lockElements(UUID boardUuid, List<Long> elementIds, String clientId) {
        locks.putIfAbsent(boardUuid, new HashMap<>());
        Map<Long, String> boardLocks = locks.get(boardUuid);

        for (Long id : elementIds) {
            String owner = boardLocks.get(id);
            if (owner != null && !owner.equals(clientId)) {
                return false;
            }
        }

        for (Long id : elementIds) {
            boardLocks.put(id, clientId);
        }
        return true;
    }

    /**
     * Снять локи с элементов. Снимает только те, которые реально принадлежат этому clientId.
     */
    public synchronized void unlockElements(UUID boardUuid, List<Long> elementIds, String clientId) {
        Map<Long, String> boardLocks = locks.get(boardUuid);
        if (boardLocks == null) return;

        for (Long id : elementIds) {
            String owner = boardLocks.get(id);
            if (owner != null && owner.equals(clientId)) {
                boardLocks.remove(id);
            }
        }
    }

    /**
     * Узнать владельца лока для одного элемента.
     */
    public synchronized Optional<String> getLockOwner(UUID boardUuid, Long elementId) {
        Map<Long, String> boardLocks = locks.get(boardUuid);
        if (boardLocks == null) return Optional.empty();
        return Optional.ofNullable(boardLocks.get(elementId));
    }

    /**
     * При отключении клиента можно освободить все его локи.
     */
    public synchronized void releaseAllForClient(String clientId) {
        for (Map<Long, String> boardLocks : locks.values()) {
            boardLocks.entrySet().removeIf(e -> clientId.equals(e.getValue()));
        }
    }
}