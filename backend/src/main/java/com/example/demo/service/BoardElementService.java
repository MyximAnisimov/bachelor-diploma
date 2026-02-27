package com.example.demo.service;

import com.example.demo.dto.*;
import java.util.List;
import java.util.UUID;

public interface BoardElementService {

    List<BoardElementDto> getElementsByBoardUuid(UUID boardUuid);

    BoardElementDto createElement(UUID boardUuid, BoardElementCreateRequest request);

    BoardElementDto updateElement(UUID boardUuid, Long elementId, BoardElementUpdateRequest request);

    BoardElementDto transformElement(UUID boardUuid, Long elementId, ElementTransformRequest request);

    GroupElementsResponse groupElements(UUID boardUuid, GroupElementsRequest request);

    void ungroupElements(UUID boardUuid, UngroupElementsRequest request);

    void reorderElements(UUID boardUuid, ReorderElementsRequest request);

    void deleteElement(UUID boardUuid, Long elementId);

    CopyElementsResponse copyElements(UUID boardUuid, CopyElementsRequest request);

    BoardElementDto updateLocks(UUID boardUuid, Long elementId, ElementLockRequest request);
}
