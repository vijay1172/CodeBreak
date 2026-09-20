"use client";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, FileCode2, Folder, FolderOpen } from "lucide-react";

type FileNode = { type: "file"; name: string; path: string };
type DirNode = { type: "dir"; name: string; path: string; children: TreeNode[] };
type TreeNode = FileNode | DirNode;

// Paths split on "/" become a nested tree; siblings sort folders-first then
// alphabetical (VS Code convention). Pure function of the file list — memoized
// by the caller, so re-renders never rebuild it.
function buildTree(files: { path: string }[]): TreeNode[] {
  const dirs = new Map<string, DirNode>();
  const root: TreeNode[] = [];
  const ensureDir = (segments: string[]): DirNode => {
    const path = segments.join("/");
    const existing = dirs.get(path);
    if (existing) return existing;
    const dir: DirNode = { type: "dir", name: segments[segments.length - 1], path, children: [] };
    dirs.set(path, dir);
    if (segments.length === 1) root.push(dir);
    else ensureDir(segments.slice(0, -1)).children.push(dir);
    return dir;
  };
  for (const file of files) {
    const segments = file.path.split("/");
    if (segments.length === 1) root.push({ type: "file", name: segments[0], path: file.path });
    else ensureDir(segments.slice(0, -1)).children.push({ type: "file", name: segments[segments.length - 1], path: file.path });
  }
  const sort = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === "dir" ? -1 : 1));
    for (const node of nodes) if (node.type === "dir") sort(node.children);
  };
  sort(root);
  return root;
}

function ancestorsOf(path: string) {
  const segments = path.split("/");
  return segments.slice(0, -1).map((_, index) => segments.slice(0, index + 1).join("/"));
}

function Row({ node, depth, activePath, onSelect, expanded, toggle }: {
  node: TreeNode;
  depth: number;
  activePath: string;
  onSelect: (path: string) => void;
  expanded: Set<string>;
  toggle: (path: string) => void;
}) {
  const indent = { paddingLeft: `${6 + depth * 11}px` };
  if (node.type === "file") {
    return <button className={node.path === activePath ? "active" : ""} style={indent} onClick={() => onSelect(node.path)} title={node.path}>
      <FileCode2 size={14} aria-hidden="true"/><span>{node.name}</span>
    </button>;
  }
  const open = expanded.has(node.path);
  return <>
    <button className="tree-dir" style={indent} onClick={() => toggle(node.path)} aria-expanded={open}>
      {open ? <ChevronDown size={12} aria-hidden="true"/> : <ChevronRight size={12} aria-hidden="true"/>}
      {open ? <FolderOpen size={14} aria-hidden="true"/> : <Folder size={14} aria-hidden="true"/>}
      <span>{node.name}</span>
    </button>
    {open && node.children.map((child) => (
      <Row key={child.path} node={child} depth={depth + 1} activePath={activePath} onSelect={onSelect} expanded={expanded} toggle={toggle}/>
    ))}
  </>;
}

export function FileTree({ files, active, onSelect }: {
  files: { path: string }[];
  active: string;
  onSelect: (path: string) => void;
}) {
  const tree = useMemo(() => buildTree(files), [files]);
  const allDirs = useMemo(() => {
    const dirs: string[] = [];
    const walk = (nodes: TreeNode[]) => {
      for (const node of nodes) if (node.type === "dir") { dirs.push(node.path); walk(node.children); }
    };
    walk(tree);
    return dirs;
  }, [tree]);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(allDirs));

  // A new challenge (new file list) resets to fully expanded; the active file's
  // folders are always kept open so the selection stays visible.
  useEffect(() => { setExpanded(new Set(allDirs)); }, [allDirs]);
  useEffect(() => {
    if (!active) return;
    setExpanded((current) => {
      const missing = ancestorsOf(active).filter((dir) => !current.has(dir));
      return missing.length ? new Set([...current, ...missing]) : current;
    });
  }, [active]);

  const toggle = (path: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  return <div className="file-tree">
    {tree.map((node) => (
      <Row key={node.path} node={node} depth={0} activePath={active} onSelect={onSelect} expanded={expanded} toggle={toggle}/>
    ))}
  </div>;
}
