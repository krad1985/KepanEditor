export const generateUniqueId = () => Math.random().toString(36).substr(2, 9);

export const deepCloneKepanTree = (treeNodes) =>
  JSON.parse(JSON.stringify(treeNodes));

export const findPathInKepanTree = (treeNodes, targetNodeId, currentPath = []) => {
  for (const kepanNode of treeNodes) {
    const newPath = [
      ...currentPath,
      { id: kepanNode.id, title: kepanNode.title, children: kepanNode.children },
    ];
    if (kepanNode.id === targetNodeId) return newPath;
    if (kepanNode.children) {
      const foundPath = findPathInKepanTree(kepanNode.children, targetNodeId, newPath);
      if (foundPath) return foundPath;
    }
  }
  return null;
};

export const findNodeInKepanTree = (treeNodes, targetNodeId) => {
  for (const kepanNode of treeNodes) {
    if (kepanNode.id === targetNodeId) return kepanNode;
    if (kepanNode.children) {
      const foundNode = findNodeInKepanTree(kepanNode.children, targetNodeId);
      if (foundNode) return foundNode;
    }
  }
  return null;
};

export const findParentInKepanTree = (treeNodes, targetNodeId, parent = null) => {
  for (let i = 0; i < treeNodes.length; i++) {
    if (treeNodes[i].id === targetNodeId) return { parent, index: i };
    if (treeNodes[i].children) {
      const result = findParentInKepanTree(treeNodes[i].children, targetNodeId, treeNodes[i].children);
      if (result) return result;
    }
  }
  return null;
};

export const countNodes = (treeNodes) => {
  let count = 0;
  for (const node of treeNodes) {
    count++;
    if (node.children?.length) count += countNodes(node.children);
  }
  return count;
};
