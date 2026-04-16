/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Moon, 
  Sun, 
  Search,
  Replace,
  ArrowRight,
  X,
  Download, 
  Trash2, 
  FileText, 
  Type, 
  Hash,
  Heart,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  Image as ImageIcon,
  Type as TypeIcon,
  Folder,
  Plus,
  ChevronRight,
  ChevronDown,
  Tag,
  Upload,
  Settings,
  MoreVertical,
  Edit2,
  FileJson,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Highlighter,
  Table as TableIcon,
  PlusSquare,
  MinusSquare,
  Columns,
  Rows,
  Grid,
  Undo,
  Redo,
  Palette,
  Quote
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useEditor, EditorContent, NodeViewWrapper, NodeViewContent, ReactNodeViewRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Image from '@tiptap/extension-image';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { v4 as uuidv4 } from 'uuid';
import { Extension, Mark, mergeAttributes } from '@tiptap/core';

// Custom Font Size Extension as a Mark
const FontSize = Mark.create({
  name: 'fontSize',
  addAttributes() {
    return {
      size: {
        default: null,
        parseHTML: element => element.style.fontSize,
        renderHTML: attributes => {
          if (!attributes.size) {
            return {}
          }
          return {
            style: `font-size: ${attributes.size}`,
          }
        },
      },
    }
  },
  parseHTML() {
    return [
      {
        tag: 'span',
        getAttrs: element => {
          const fontSize = (element as HTMLElement).style.fontSize
          return fontSize ? { size: fontSize } : false
        },
      },
    ]
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes), 0]
  },
})

// Custom Resizable Image Extension
const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: '100%',
        renderHTML: attributes => ({
          width: attributes.width,
        }),
      },
      height: {
        default: 'auto',
        renderHTML: attributes => ({
          height: attributes.height,
        }),
      },
    }
  },
  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageComponent)
  },
})

const ResizableImageComponent = ({ node, updateAttributes }: any) => {
  const [isResizing, setIsResizing] = useState(false)
  const imageRef = useRef<HTMLImageElement>(null)

  const onMouseDown = (event: React.MouseEvent) => {
    event.preventDefault()
    setIsResizing(true)

    const startX = event.clientX
    const startWidth = imageRef.current?.clientWidth || 0

    const onMouseMove = (moveEvent: MouseEvent) => {
      const currentWidth = startWidth + (moveEvent.clientX - startX)
      updateAttributes({ width: `${currentWidth}px` })
    }

    const onMouseUp = () => {
      setIsResizing(false)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  return (
    <NodeViewWrapper className="relative inline-block group">
      <img
        ref={imageRef}
        src={node.attrs.src}
        style={{ width: node.attrs.width, height: node.attrs.height }}
        className="rounded-xl max-w-full"
        alt=""
      />
      <div
        onMouseDown={onMouseDown}
        className="absolute bottom-1 right-1 w-4 h-4 bg-pink-500 rounded-full cursor-nwse-resize opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-lg"
      >
        <div className="w-1.5 h-1.5 bg-white rounded-full" />
      </div>
    </NodeViewWrapper>
  )
}

interface FileNode {
  id: string;
  name: string;
  content: string;
  tags: string[];
  parentId: string | null;
  type: 'file';
}

interface FolderNode {
  id: string;
  name: string;
  parentId: string | null;
  type: 'folder';
  isOpen?: boolean;
}

type AppNode = FileNode | FolderNode;

export default function App() {
  const [nodes, setNodes] = useState<AppNode[]>(() => {
    const saved = localStorage.getItem('notepad-nodes');
    if (saved) return JSON.parse(saved);
    return [
      { id: 'root-file', name: 'Моя первая заметка', content: '<p>Привет! Это твой новый блокнот ✨</p>', tags: ['привет'], parentId: null, type: 'file' }
    ];
  });
  const [activeFileId, setActiveFileId] = useState<string | null>(() => {
    const saved = localStorage.getItem('active-file-id');
    return saved || 'root-file';
  });
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [fontFamily, setFontFamily] = useState('sans');
  const [showImagePanel, setShowImagePanel] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [showSidebar, setShowSidebar] = useState(true);
  const [newTagName, setNewTagName] = useState('');
  const [showCreatePanel, setShowCreatePanel] = useState<{ type: 'file' | 'folder', parentId: string | null } | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [lineHeight, setLineHeight] = useState(() => {
    const saved = localStorage.getItem('line-height');
    return saved || '1.6';
  });
  const [lastSaved, setLastSaved] = useState<string>(() => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const [isAutosaving, setIsAutosaving] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState<'text' | 'highlight' | 'fontSize' | 'lineHeight' | null>(null);

  const activeFile = nodes.find(n => n.id === activeFileId && n.type === 'file') as FileNode | undefined;

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      ResizableImage.configure({
        allowBase64: true,
      }),
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TextStyle,
      Color,
      FontSize,
    ],
    content: activeFile?.content || '',
    onUpdate: ({ editor }) => {
      if (activeFileId) {
        const html = editor.getHTML();
        setNodes(prev => prev.map(n => n.id === activeFileId ? { ...n, content: html } : n));
      }
      updateCounts(editor.getText());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl focus:outline-none min-h-[400px] max-w-none',
      },
    },
  }, [activeFileId]);

  const updateCounts = (text: string) => {
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    setWordCount(words);
    setCharCount(text.length);
  };

  useEffect(() => {
    localStorage.setItem('notepad-nodes', JSON.stringify(nodes));
  }, [nodes]);

  useEffect(() => {
    localStorage.setItem('active-file-id', activeFileId || '');
  }, [activeFileId]);

  // Load theme preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') setIsDarkMode(true);
  }, []);

  useEffect(() => {
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('line-height', lineHeight);
  }, [lineHeight]);

  // Autosave interval logic (30 seconds)
  useEffect(() => {
    if (!activeFileId) return;

    const interval = setInterval(() => {
      setIsAutosaving(true);
      
      // Simulate a save process (actual saving happens on update, but we sync it here)
      setTimeout(() => {
        setIsAutosaving(false);
        setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }, 2000);
    }, 30000);

    return () => clearInterval(interval);
  }, [activeFileId]);

  const handleExport = useCallback(() => {
    if (!editor) return;
    const text = editor.getText();
    if (!text.trim()) return;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeFile?.name || 'note'}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }, [editor, activeFile]);

  const handleExportJSON = () => {
    const data = { nodes, activeFileId, fontFamily, isDarkMode };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `notepad-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.nodes) {
          setNodes(data.nodes);
          if (data.activeFileId) setActiveFileId(data.activeFileId);
          alert('Данные успешно импортированы!');
        }
      } catch (err) {
        alert('Ошибка при импорте JSON');
      }
    };
    reader.readAsText(file);
  };

  const handleCreateItem = () => {
    if (!newItemName || !showCreatePanel) return;
    
    if (showCreatePanel.type === 'folder') {
      const newFolder: FolderNode = { 
        id: uuidv4(), 
        name: newItemName, 
        parentId: showCreatePanel.parentId, 
        type: 'folder', 
        isOpen: true 
      };
      setNodes([...nodes, newFolder]);
    } else {
      const newFile: FileNode = { 
        id: uuidv4(), 
        name: newItemName, 
        content: '', 
        tags: [], 
        parentId: showCreatePanel.parentId, 
        type: 'file' 
      };
      setNodes([...nodes, newFile]);
      setActiveFileId(newFile.id);
    }
    
    setNewItemName('');
    setShowCreatePanel(null);
  };

  const handleRename = (id: string, newName: string) => {
    if (!newName.trim()) return;
    setNodes(prev => prev.map(n => n.id === id ? { ...n, name: newName } : n));
    setEditingNodeId(null);
  };

  const deleteNode = (id: string) => {
    const toDelete = new Set([id]);
    // Recursive delete for folders
    let size;
    do {
      size = toDelete.size;
      nodes.forEach(n => {
        if (n.parentId && toDelete.has(n.parentId)) toDelete.add(n.id);
      });
    } while (toDelete.size !== size);

    setNodes(nodes.filter(n => !toDelete.has(n.id)));
    if (toDelete.has(activeFileId || '')) setActiveFileId(null);
    setDeleteConfirmId(null);
  };

  const toggleFolder = (id: string) => {
    setNodes(nodes.map(n => n.id === id && n.type === 'folder' ? { ...n, isOpen: !n.isOpen } : n));
  };

  const addTag = () => {
    if (newTagName && activeFileId) {
      const tagsToAdd = newTagName
        .split(/[,\s]+/)
        .map(t => t.trim())
        .filter(t => t.length > 0);
        
      if (tagsToAdd.length > 0) {
        setNodes(prev => prev.map(n => 
          n.id === activeFileId && n.type === 'file' 
            ? { ...n, tags: Array.from(new Set([...n.tags, ...tagsToAdd])) } 
            : n
        ));
      }
      setNewTagName('');
    }
  };

  const removeTag = (tag: string) => {
    setNodes(prev => prev.map(n => 
      n.id === activeFileId && n.type === 'file' 
        ? { ...n, tags: n.tags.filter(t => t !== tag) } 
        : n
    ));
  };

  const handleClear = () => {
    if (window.confirm('Вы уверены, что хотите очистить заметку?')) {
      editor?.commands.setContent('');
    }
  };

  const handleReplaceAll = () => {
    if (!searchQuery || !editor) return;
    const currentHtml = editor.getHTML();
    const newHtml = currentHtml.split(searchQuery).join(replaceQuery);
    editor.commands.setContent(newHtml);
  };

  const handleReplaceNext = () => {
    if (!searchQuery || !editor) return;
    const currentHtml = editor.getHTML();
    const newHtml = currentHtml.replace(searchQuery, replaceQuery);
    editor.commands.setContent(newHtml);
  };

  const handleAddImage = () => {
    if (imageUrl && editor) {
      editor.chain().focus().setImage({ src: imageUrl }).run();
      setImageUrl('');
      setShowImagePanel(false);
    }
  };

  const colors = [
    { name: 'Default', color: 'inherit' },
    { name: 'Red', color: '#ef4444' },
    { name: 'Orange', color: '#f97316' },
    { name: 'Yellow', color: '#eab308' },
    { name: 'Green', color: '#22c55e' },
    { name: 'Blue', color: '#3b82f6' },
    { name: 'Purple', color: '#a855f7' },
    { name: 'Pink', color: '#ec4899' },
  ];

  const fontSizes = [
    { label: 'Маленький', value: '12px' },
    { label: 'Обычный', value: '16px' },
    { label: 'Большой', value: '24px' }
  ];

  const lineHeights = [
    { label: 'Узкий', value: '1.2' },
    { label: 'Обычный', value: '1.6' },
    { label: 'Широкий', value: '2.0' },
    { label: 'Очень широкий', value: '2.5' }
  ];

  const renderTree = (parentId: string | null = null, level = 0) => {
    let children = nodes.filter(n => n.parentId === parentId);
    
    if (tagFilter) {
      const doesNodeMatch = (node: AppNode): boolean => {
        if (node.type === 'file') return node.tags.includes(tagFilter);
        const folderChildren = nodes.filter(n => n.parentId === node.id);
        return folderChildren.some(child => doesNodeMatch(child));
      };
      children = children.filter(child => doesNodeMatch(child));
    }

    return children.map(node => (
      <div key={node.id} className="select-none group">
        <div 
          className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
            activeFileId === node.id 
              ? isDarkMode ? 'bg-purple-800/50 text-white' : 'bg-pink-100 text-pink-700'
              : isDarkMode ? 'hover:bg-purple-900/30 text-purple-300' : 'hover:bg-pink-50 text-pink-500'
          }`}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
          onClick={() => node.type === 'file' ? setActiveFileId(node.id) : toggleFolder(node.id)}
        >
          {node.type === 'folder' ? (
            node.isOpen ? <ChevronDown className="w-4 h-4 opacity-50" /> : <ChevronRight className="w-4 h-4 opacity-50" />
          ) : (
            <FileText className="w-4 h-4 opacity-50" />
          )}
          {editingNodeId === node.id ? (
            <input
              autoFocus
              type="text"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onBlur={() => handleRename(node.id, editingName)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename(node.id, editingName);
                if (e.key === 'Escape') setEditingNodeId(null);
              }}
              onClick={(e) => e.stopPropagation()}
              className={`flex-1 px-1 py-0.5 text-xs rounded border outline-none ${
                isDarkMode ? 'bg-purple-950 border-purple-800' : 'bg-white border-pink-200'
              }`}
            />
          ) : (
            <span className="text-sm font-medium flex-1 truncate">{node.name}</span>
          )}
          
          <div className="relative">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setActiveMenuId(activeMenuId === node.id ? null : node.id);
              }}
              className={`p-1 rounded-md transition-opacity lg:opacity-0 lg:group-hover:opacity-100 ${
                activeMenuId === node.id ? 'opacity-100 bg-pink-100/50 text-pink-600' : 'hover:bg-pink-50'
              }`}
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            <AnimatePresence>
              {activeMenuId === node.id && (
                <>
                  <div 
                    className="fixed inset-0 z-[60]" 
                    onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); }}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className={`absolute right-0 top-full mt-1 w-40 rounded-xl shadow-xl z-[70] border overflow-hidden ${
                      isDarkMode ? 'bg-purple-900 border-purple-800' : 'bg-white border-pink-100'
                    }`}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingNodeId(node.id);
                        setEditingName(node.name);
                        setActiveMenuId(null);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors ${
                        isDarkMode ? 'hover:bg-purple-800 text-purple-200' : 'hover:bg-pink-50 text-pink-600'
                      }`}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Переименовать
                    </button>

                    {node.type === 'folder' && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowCreatePanel({ type: 'folder', parentId: node.id });
                            setActiveMenuId(null);
                          }}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors ${
                            isDarkMode ? 'hover:bg-purple-800 text-purple-200' : 'hover:bg-pink-50 text-pink-600'
                          }`}
                        >
                          <Folder className="w-3.5 h-3.5" />
                          Новая папка
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowCreatePanel({ type: 'file', parentId: node.id });
                            setActiveMenuId(null);
                          }}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors ${
                            isDarkMode ? 'hover:bg-purple-800 text-purple-200' : 'hover:bg-pink-50 text-pink-600'
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Новый файл
                        </button>
                      </>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmId(node.id);
                        setActiveMenuId(null);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Удалить
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
        {node.type === 'folder' && node.isOpen && renderTree(node.id, level + 1)}
      </div>
    ));
  };

  return (
    <div className={`flex h-screen transition-colors duration-500 ${isDarkMode ? 'bg-[#1a1625] text-purple-100' : 'bg-[#fff5f7] text-gray-800'}`}>
      {/* Sidebar Overlay for Mobile */}
      <AnimatePresence>
        {showSidebar && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowSidebar(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {showSidebar && (
          <motion.aside
            initial={{ x: -280, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -280, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`fixed lg:relative inset-y-0 left-0 w-[280px] z-50 lg:z-0 border-r flex flex-col ${
              isDarkMode ? 'bg-[#1f1a2e] border-purple-800/50' : 'bg-white border-pink-100'
            }`}
          >
            <div className="p-6 flex items-center justify-between border-b border-inherit">
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-pink-500 fill-current" />
                <h2 className="font-bold tracking-tight">Проводник</h2>
              </div>
              <div className="flex gap-1">
                <button 
                  onClick={() => setShowCreatePanel({ type: 'folder', parentId: null })} 
                  className={`p-1.5 rounded-lg transition-colors ${
                    showCreatePanel?.type === 'folder' && !showCreatePanel.parentId ? 'bg-pink-100 text-pink-600' : 'hover:bg-pink-50'
                  }`} 
                  title="Новая папка"
                >
                  <Folder className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setShowCreatePanel({ type: 'file', parentId: null })} 
                  className={`p-1.5 rounded-lg transition-colors ${
                    showCreatePanel?.type === 'file' && !showCreatePanel.parentId ? 'bg-pink-100 text-pink-600' : 'hover:bg-pink-50'
                  }`} 
                  title="Новый файл"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Tag Filter */}
            <div className={`px-4 py-2 border-b border-inherit flex flex-wrap gap-1.5 ${isDarkMode ? 'bg-purple-900/10' : 'bg-pink-50/20'}`}>
              <button 
                onClick={() => setTagFilter(null)}
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase transition-all ${
                  !tagFilter 
                    ? isDarkMode ? 'bg-purple-600 text-white' : 'bg-pink-500 text-white'
                    : isDarkMode ? 'bg-purple-900/50 text-purple-400' : 'bg-pink-50 text-pink-400'
                }`}
              >
                Все
              </button>
              {Array.from(new Set(nodes.flatMap(n => n.type === 'file' ? n.tags : []))).filter(tag => tag && tag.trim()).map(tag => (
                <button 
                  key={tag}
                  onClick={() => setTagFilter(tag === tagFilter ? null : tag)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase transition-all ${
                    tag === tagFilter 
                      ? isDarkMode ? 'bg-purple-600 text-white' : 'bg-pink-500 text-white'
                      : isDarkMode ? 'bg-purple-900/50 text-purple-400' : 'bg-pink-50 text-pink-400'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>

            <AnimatePresence>
              {showCreatePanel && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className={`px-4 py-3 border-b border-inherit ${
                    isDarkMode ? 'bg-purple-900/20' : 'bg-pink-50/30'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-1">
                      <span className="text-[10px] opacity-40 uppercase font-bold">
                        {showCreatePanel.parentId ? 'В папку:' : 'В корень:'}
                      </span>
                      <input
                        autoFocus
                        type="text"
                        placeholder={showCreatePanel.type === 'folder' ? "Имя папки..." : "Имя файла..."}
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleCreateItem();
                          if (e.key === 'Escape') setShowCreatePanel(null);
                        }}
                        className={`flex-1 px-2 py-1 text-xs rounded border outline-none ${
                          isDarkMode ? 'bg-purple-950 border-purple-800' : 'bg-white border-pink-200'
                        }`}
                      />
                    </div>
                    <button 
                      onClick={handleCreateItem}
                      className="p-1 text-pink-500 hover:bg-pink-100 rounded"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button 
                      onClick={() => setShowCreatePanel(null)}
                      className="p-1 opacity-50 hover:opacity-100"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex-1 overflow-y-auto p-4 space-y-1 group">
              {renderTree(null)}
            </div>

            <div className="p-4 border-t border-inherit space-y-2">
              <button 
                onClick={handleExport}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  isDarkMode ? 'bg-purple-600 hover:bg-purple-500 text-white' : 'bg-pink-500 hover:bg-pink-400 text-white'
                }`}
              >
                <Download className="w-4 h-4" />
                Экспорт TXT
              </button>
              <button 
                onClick={handleExportJSON}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  isDarkMode ? 'bg-purple-900/50 hover:bg-purple-800/50' : 'bg-pink-50 hover:bg-pink-100 text-pink-600'
                }`}
              >
                <FileJson className="w-4 h-4" />
                Экспорт JSON
              </button>
              <label className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                isDarkMode ? 'bg-purple-900/50 hover:bg-purple-800/50' : 'bg-pink-50 hover:bg-pink-100 text-pink-600'
              }`}>
                <Upload className="w-4 h-4" />
                Импорт JSON
                <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
              </label>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <header className="flex justify-between items-center px-4 md:px-8 py-4 md:py-6 border-b border-transparent">
          <div className="flex items-center gap-3 md:gap-4">
            <button 
              onClick={() => setShowSidebar(!showSidebar)}
              className={`p-2 rounded-xl transition-all ${isDarkMode ? 'bg-purple-900/50 hover:bg-purple-800/50' : 'bg-white shadow-sm hover:shadow-md border border-pink-50'}`}
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg md:text-xl font-bold tracking-tight truncate max-w-[150px] md:max-w-none">{activeFile?.name || 'Выберите файл'}</h1>
              <div className="flex flex-wrap gap-1 md:gap-2 mt-1">
                {activeFile?.tags.map(tag => (
                  <span key={tag} className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    isDarkMode ? 'bg-purple-800 text-purple-200' : 'bg-pink-100 text-pink-600'
                  }`}>
                    {tag}
                    <button onClick={() => removeTag(tag)}><X className="w-2.5 h-2.5" /></button>
                  </span>
                ))}
                {activeFile && (
                  <div className="flex items-center gap-1">
                    <input 
                      type="text" 
                      placeholder="Тег..." 
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addTag()}
                      className="bg-transparent border-none outline-none text-[10px] font-bold uppercase tracking-wider w-16 opacity-50 focus:opacity-100"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-3 rounded-2xl transition-all ${
                isDarkMode 
                  ? 'bg-purple-900/50 text-yellow-400 hover:bg-purple-800/50' 
                  : 'bg-white text-orange-400 shadow-sm hover:shadow-md border border-pink-50'
              }`}
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </motion.button>
          </div>
        </header>

        <main className="flex-1 overflow-hidden px-4 md:px-8 pb-4 md:pb-8">
          <div className="max-w-4xl mx-auto h-full flex flex-col w-full">
            {activeFileId ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex-1 flex flex-col relative rounded-[2.5rem] shadow-xl border overflow-hidden ${
                  isDarkMode ? 'bg-[#251f33] border-purple-800/50' : 'bg-white border-pink-100'
                }`}
              >
                {/* Toolbar */}
                <div className={`flex-none flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b gap-3 ${
                  isDarkMode ? 'border-purple-800/50 bg-purple-900/20' : 'border-pink-50 bg-pink-50/30'
                }`}>
                  <div className="flex items-center gap-3 md:gap-4 w-full sm:w-auto flex-wrap">
                    <div className="flex items-center gap-1 shrink-0">
                      <button 
                        onClick={() => editor?.chain().focus().undo().run()}
                        disabled={!editor?.can().undo()}
                        className={`p-1.5 rounded-lg transition-all ${isDarkMode ? 'hover:bg-purple-800/50 disabled:opacity-30' : 'hover:bg-pink-100 disabled:opacity-30'}`}
                        title="Назад (Ctrl+Z)"
                      >
                        <Undo className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => editor?.chain().focus().redo().run()}
                        disabled={!editor?.can().redo()}
                        className={`p-1.5 rounded-lg transition-all ${isDarkMode ? 'hover:bg-purple-800/50 disabled:opacity-30' : 'hover:bg-pink-100 disabled:opacity-30'}`}
                        title="Вперед (Ctrl+Y)"
                      >
                        <Redo className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs md:text-sm font-medium opacity-70 shrink-0">
                      <Type className="w-4 h-4" />
                      <span>{wordCount} слов</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs md:text-sm font-medium opacity-70 shrink-0">
                      <Hash className="w-4 h-4" />
                      <span>{charCount} симв.</span>
                    </div>
                    <div className={`hidden md:flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ml-2 border-l pl-3 border-inherit transition-colors ${isAutosaving ? 'text-pink-500' : 'opacity-40'}`}>
                      {isAutosaving ? (
                        <motion.span 
                          animate={{ opacity: [0.4, 1, 0.4] }} 
                          transition={{ repeat: Infinity, duration: 1.5 }}
                        >
                          Автосохранение...
                        </motion.span>
                      ) : (
                        <span>Сохранено в {lastSaved}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <button
                      onClick={() => setShowSearch(!showSearch)}
                      className={`p-2 rounded-xl transition-all ${
                        showSearch 
                          ? isDarkMode ? 'bg-purple-800/50 text-purple-200' : 'bg-pink-100 text-pink-600'
                          : isDarkMode ? 'hover:bg-purple-900/30 text-purple-400' : 'hover:bg-pink-50 text-pink-400'
                      }`}
                    >
                      <Search className="w-5 h-5" />
                    </button>
                    <button onClick={handleClear} className={`p-2 rounded-xl transition-all ${isDarkMode ? 'hover:bg-red-900/30 text-red-400' : 'hover:bg-red-50 text-red-400'}`}>
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Formatting Toolbar */}
                <div className={`flex-none flex items-center gap-1 px-4 md:px-6 py-2 border-b flex-wrap ${
                  isDarkMode ? 'border-purple-800/50 bg-purple-900/10' : 'border-pink-50 bg-pink-50/10'
                }`}>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => editor?.chain().focus().toggleBold().run()} className={`p-2 rounded-lg ${editor?.isActive('bold') ? (isDarkMode ? 'bg-purple-700 text-white' : 'bg-pink-200 text-pink-700') : (isDarkMode ? 'text-purple-400' : 'text-pink-400')}`}><Bold className="w-4 h-4" /></button>
                    <button onClick={() => editor?.chain().focus().toggleItalic().run()} className={`p-2 rounded-lg ${editor?.isActive('italic') ? (isDarkMode ? 'bg-purple-700 text-white' : 'bg-pink-200 text-pink-700') : (isDarkMode ? 'text-purple-400' : 'text-pink-400')}`}><Italic className="w-4 h-4" /></button>
                    <button onClick={() => editor?.chain().focus().toggleUnderline().run()} className={`p-2 rounded-lg ${editor?.isActive('underline') ? (isDarkMode ? 'bg-purple-700 text-white' : 'bg-pink-200 text-pink-700') : (isDarkMode ? 'text-purple-400' : 'text-pink-400')}`} title="Подчеркивание"><UnderlineIcon className="w-4 h-4" /></button>
                  </div>
                  
                  <div className={`w-px h-4 mx-1 shrink-0 ${isDarkMode ? 'bg-purple-800' : 'bg-pink-100'}`} />

                  <div className="flex items-center gap-1 shrink-0">
                    <div className="relative">
                      <button 
                        onClick={() => setShowColorPicker(showColorPicker === 'text' ? null : 'text')} 
                        className={`p-2 rounded-lg ${showColorPicker === 'text' ? (isDarkMode ? 'bg-purple-700 text-white' : 'bg-pink-200 text-pink-700') : (isDarkMode ? 'text-purple-400' : 'text-pink-400')}`} 
                        title="Цвет текста"
                      >
                        <Palette className="w-4 h-4" />
                      </button>
                      <AnimatePresence>
                        {showColorPicker === 'text' && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className={`absolute top-full left-0 mt-2 p-2 rounded-xl shadow-xl z-[100] flex gap-1 border ${isDarkMode ? 'bg-purple-900 border-purple-800' : 'bg-white border-pink-100'}`}
                          >
                            {colors.map(c => (
                              <button
                                key={c.color}
                                onClick={() => {
                                  if (c.color === 'inherit') editor?.chain().focus().unsetColor().run();
                                  else editor?.chain().focus().setColor(c.color).run();
                                  setShowColorPicker(null);
                                }}
                                className="w-6 h-6 rounded-full border border-black/10"
                                style={{ backgroundColor: c.color === 'inherit' ? (isDarkMode ? '#fff' : '#000') : c.color }}
                                title={c.name}
                              />
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="relative">
                      <button 
                        onClick={() => setShowColorPicker(showColorPicker === 'highlight' ? null : 'highlight')} 
                        className={`p-2 rounded-lg ${editor?.isActive('highlight') || showColorPicker === 'highlight' ? (isDarkMode ? 'bg-purple-700 text-white' : 'bg-pink-200 text-pink-700') : (isDarkMode ? 'text-purple-400' : 'text-pink-400')}`} 
                        title="Маркер"
                      >
                        <Highlighter className="w-4 h-4" />
                      </button>
                      <AnimatePresence>
                        {showColorPicker === 'highlight' && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className={`absolute top-full left-0 mt-2 p-2 rounded-xl shadow-xl z-[100] flex gap-1 border ${isDarkMode ? 'bg-purple-900 border-purple-800' : 'bg-white border-pink-100'}`}
                          >
                            <button
                              onClick={() => {
                                editor?.chain().focus().unsetHighlight().run();
                                setShowColorPicker(null);
                              }}
                              className="w-6 h-6 rounded-full border border-black/10 flex items-center justify-center bg-white"
                              title="Сбросить"
                            >
                              <X className="w-3 h-3 text-black" />
                            </button>
                            {colors.slice(1).map(c => (
                              <button
                                key={c.color}
                                onClick={() => {
                                  editor?.chain().focus().toggleHighlight({ color: c.color }).run();
                                  setShowColorPicker(null);
                                }}
                                className="w-6 h-6 rounded-full border border-black/10"
                                style={{ backgroundColor: c.color }}
                                title={c.name}
                              />
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="relative">
                      <button 
                        onClick={() => setShowColorPicker(showColorPicker === 'fontSize' ? null : 'fontSize')} 
                        className={`p-2 rounded-lg flex items-center gap-1 ${showColorPicker === 'fontSize' ? (isDarkMode ? 'bg-purple-700 text-white' : 'bg-pink-200 text-pink-700') : (isDarkMode ? 'text-purple-400' : 'text-pink-400')}`} 
                        title="Размер шрифта"
                      >
                        <span className="text-[10px] font-bold opacity-70">
                          {editor?.getAttributes('fontSize').size?.replace('px', '') || '16'}
                        </span>
                        <ChevronDown className="w-3 h-3" />
                      </button>
                      <AnimatePresence>
                        {showColorPicker === 'fontSize' && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className={`absolute top-full left-0 mt-2 p-1 rounded-xl shadow-xl z-[100] flex flex-col border min-w-[120px] ${isDarkMode ? 'bg-purple-900 border-purple-800' : 'bg-white border-pink-100'}`}
                          >
                            {fontSizes.map(size => (
                              <button
                                key={size.value}
                                onClick={() => {
                                  editor?.chain().focus().setMark('fontSize', { size: size.value }).run();
                                  setShowColorPicker(null);
                                }}
                                className={`px-3 py-2 text-xs text-left rounded-lg transition-colors flex items-center justify-between ${
                                  isDarkMode ? 'hover:bg-purple-800 text-purple-200' : 'hover:bg-pink-50 text-pink-600'
                                } ${editor?.getAttributes('fontSize').size === size.value ? (isDarkMode ? 'bg-purple-800' : 'bg-pink-50') : ''}`}
                              >
                                <span>{size.label}</span>
                                <span className="opacity-50 text-[10px]">{size.value}</span>
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="relative">
                      <button 
                        onClick={() => setShowColorPicker(showColorPicker === 'lineHeight' ? null : 'lineHeight')} 
                        className={`p-2 rounded-lg flex items-center gap-1 ${showColorPicker === 'lineHeight' ? (isDarkMode ? 'bg-purple-700 text-white' : 'bg-pink-200 text-pink-700') : (isDarkMode ? 'text-purple-400' : 'text-pink-400')}`} 
                        title="Межстрочный интервал"
                      >
                        <AlignJustify className="w-4 h-4" />
                        <ChevronDown className="w-3 h-3" />
                      </button>
                      <AnimatePresence>
                        {showColorPicker === 'lineHeight' && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className={`absolute top-full left-0 mt-2 p-1 rounded-xl shadow-xl z-[100] flex flex-col border min-w-[140px] ${isDarkMode ? 'bg-purple-900 border-purple-800' : 'bg-white border-pink-100'}`}
                          >
                            {lineHeights.map(lh => (
                              <button
                                key={lh.value}
                                onClick={() => {
                                  setLineHeight(lh.value);
                                  setShowColorPicker(null);
                                }}
                                className={`px-3 py-2 text-xs text-left rounded-lg transition-colors flex items-center justify-between ${
                                  isDarkMode ? 'hover:bg-purple-800 text-purple-200' : 'hover:bg-pink-50 text-pink-600'
                                } ${lineHeight === lh.value ? (isDarkMode ? 'bg-purple-800' : 'bg-pink-50') : ''}`}
                              >
                                <span>{lh.label}</span>
                                <span className="opacity-50 text-[10px]">{lh.value}</span>
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  <div className={`w-px h-4 mx-1 shrink-0 ${isDarkMode ? 'bg-purple-800' : 'bg-pink-100'}`} />
                  
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => editor?.chain().focus().setTextAlign('left').run()} className={`p-2 rounded-lg ${editor?.isActive({ textAlign: 'left' }) ? (isDarkMode ? 'bg-purple-700 text-white' : 'bg-pink-200 text-pink-700') : (isDarkMode ? 'text-purple-400' : 'text-pink-400')}`} title="По левому краю"><AlignLeft className="w-4 h-4" /></button>
                    <button onClick={() => editor?.chain().focus().setTextAlign('center').run()} className={`p-2 rounded-lg ${editor?.isActive({ textAlign: 'center' }) ? (isDarkMode ? 'bg-purple-700 text-white' : 'bg-pink-200 text-pink-700') : (isDarkMode ? 'text-purple-400' : 'text-pink-400')}`} title="По центру"><AlignCenter className="w-4 h-4" /></button>
                    <button onClick={() => editor?.chain().focus().setTextAlign('right').run()} className={`p-2 rounded-lg ${editor?.isActive({ textAlign: 'right' }) ? (isDarkMode ? 'bg-purple-700 text-white' : 'bg-pink-200 text-pink-700') : (isDarkMode ? 'text-purple-400' : 'text-pink-400')}`} title="По правому краю"><AlignRight className="w-4 h-4" /></button>
                    <button onClick={() => editor?.chain().focus().setTextAlign('justify').run()} className={`p-2 rounded-lg ${editor?.isActive({ textAlign: 'justify' }) ? (isDarkMode ? 'bg-purple-700 text-white' : 'bg-pink-200 text-pink-700') : (isDarkMode ? 'text-purple-400' : 'text-pink-400')}`} title="По ширине"><AlignJustify className="w-4 h-4" /></button>
                  </div>

                  <div className={`w-px h-4 mx-1 shrink-0 ${isDarkMode ? 'bg-purple-800' : 'bg-pink-100'}`} />
                  
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => editor?.chain().focus().toggleBulletList().run()} className={`p-2 rounded-lg ${editor?.isActive('bulletList') ? (isDarkMode ? 'bg-purple-700 text-white' : 'bg-pink-200 text-pink-700') : (isDarkMode ? 'text-purple-400' : 'text-pink-400')}`} title="Список"><List className="w-4 h-4" /></button>
                    <button onClick={() => editor?.chain().focus().toggleBlockquote().run()} className={`p-2 rounded-lg ${editor?.isActive('blockquote') ? (isDarkMode ? 'bg-purple-700 text-white' : 'bg-pink-200 text-pink-700') : (isDarkMode ? 'text-purple-400' : 'text-pink-400')}`} title="Цитата"><Quote className="w-4 h-4" /></button>
                    <button onClick={() => setShowImagePanel(!showImagePanel)} className={`p-2 rounded-lg ${showImagePanel ? (isDarkMode ? 'bg-purple-700 text-white' : 'bg-pink-200 text-pink-700') : (isDarkMode ? 'text-purple-400' : 'text-pink-400')}`} title="Картинка"><ImageIcon className="w-4 h-4" /></button>
                    <button 
                      onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} 
                      className={`p-2 rounded-lg ${editor?.isActive('table') ? (isDarkMode ? 'bg-purple-700 text-white' : 'bg-pink-200 text-pink-700') : (isDarkMode ? 'text-purple-400' : 'text-pink-400')}`}
                      title="Вставить таблицу"
                    >
                      <TableIcon className="w-4 h-4" />
                    </button>
                  </div>

                  <div className={`w-px h-4 mx-1 shrink-0 ${isDarkMode ? 'bg-purple-800' : 'bg-pink-100'}`} />
                  
                  <button
                    onClick={() => setFontFamily(fontFamily === 'sans' ? 'serif' : 'sans')}
                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      isDarkMode ? 'bg-purple-800/50 text-purple-300' : 'bg-pink-50 text-pink-600'
                    }`}
                  >
                    <TypeIcon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{fontFamily === 'sans' ? 'Без засечек' : 'С засечками'}</span>
                  </button>
                </div>

                {/* Table Controls */}
                {editor?.isActive('table') && (
                  <div className={`flex-none flex flex-wrap items-center gap-1 px-6 py-2 border-b ${
                    isDarkMode ? 'border-purple-800/50 bg-purple-900/20' : 'border-pink-50 bg-pink-50/20'
                  }`}>
                    <button onClick={() => editor.chain().focus().addColumnBefore().run()} className="p-1.5 hover:bg-pink-100 dark:hover:bg-purple-800 rounded text-xs flex items-center gap-1" title="Добавить столбец слева"><Columns className="w-3 h-3" />+</button>
                    <button onClick={() => editor.chain().focus().addColumnAfter().run()} className="p-1.5 hover:bg-pink-100 dark:hover:bg-purple-800 rounded text-xs flex items-center gap-1" title="Добавить столбец справа">+<Columns className="w-3 h-3" /></button>
                    <button onClick={() => editor.chain().focus().deleteColumn().run()} className="p-1.5 hover:bg-red-100 text-red-500 rounded text-xs flex items-center gap-1" title="Удалить столбец"><MinusSquare className="w-3 h-3" /></button>
                    <div className="w-px h-4 mx-1 bg-inherit opacity-20" />
                    <button onClick={() => editor.chain().focus().addRowBefore().run()} className="p-1.5 hover:bg-pink-100 dark:hover:bg-purple-800 rounded text-xs flex items-center gap-1" title="Добавить строку сверху"><Rows className="w-3 h-3" />+</button>
                    <button onClick={() => editor.chain().focus().addRowAfter().run()} className="p-1.5 hover:bg-pink-100 dark:hover:bg-purple-800 rounded text-xs flex items-center gap-1" title="Добавить строку снизу">+<Rows className="w-3 h-3" /></button>
                    <button onClick={() => editor.chain().focus().deleteRow().run()} className="p-1.5 hover:bg-red-100 text-red-500 rounded text-xs flex items-center gap-1" title="Удалить строку"><MinusSquare className="w-3 h-3" /></button>
                    <div className="w-px h-4 mx-1 bg-inherit opacity-20" />
                    <button onClick={() => editor.chain().focus().mergeCells().run()} className="p-1.5 hover:bg-pink-100 dark:hover:bg-purple-800 rounded text-xs flex items-center gap-1" title="Объединить ячейки"><Grid className="w-3 h-3" /></button>
                    <button onClick={() => editor.chain().focus().splitCell().run()} className="p-1.5 hover:bg-pink-100 dark:hover:bg-purple-800 rounded text-xs flex items-center gap-1" title="Разделить ячейку"><PlusSquare className="w-3 h-3" /></button>
                    <button onClick={() => editor.chain().focus().deleteTable().run()} className="p-1.5 hover:bg-red-100 text-red-500 rounded text-xs flex items-center gap-1" title="Удалить таблицу"><Trash2 className="w-3 h-3" /></button>
                  </div>
                )}

                {/* Panels */}
                <AnimatePresence>
                  {showSearch && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="flex-none overflow-hidden border-b border-inherit p-4 flex flex-col sm:flex-row gap-3">
                      <div className="flex flex-col sm:flex-row flex-1 gap-2">
                        <input type="text" placeholder="Найти..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className={`flex-1 px-3 py-1.5 rounded-lg border outline-none text-sm ${isDarkMode ? 'bg-purple-950/50 border-purple-800/50' : 'bg-white border-pink-100'}`} />
                        <input type="text" placeholder="Заменить..." value={replaceQuery} onChange={e => setReplaceQuery(e.target.value)} className={`flex-1 px-3 py-1.5 rounded-lg border outline-none text-sm ${isDarkMode ? 'bg-purple-950/50 border-purple-800/50' : 'bg-white border-pink-100'}`} />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={handleReplaceNext} className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold bg-pink-100 text-pink-700">Заменить</button>
                        <button onClick={handleReplaceAll} className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold bg-pink-500 text-white">Всё</button>
                      </div>
                    </motion.div>
                  )}
                  {showImagePanel && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="flex-none overflow-hidden border-b border-inherit p-4 flex flex-col sm:flex-row gap-3">
                      <input type="text" placeholder="URL изображения..." value={imageUrl} onChange={e => setImageUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddImage()} className={`flex-1 px-3 py-1.5 rounded-lg border outline-none text-sm ${isDarkMode ? 'bg-purple-950/50 border-purple-800/50' : 'bg-white border-pink-100'}`} />
                      <button onClick={handleAddImage} className="px-4 py-1.5 rounded-lg text-xs font-bold bg-pink-500 text-white">Вставить</button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Editor Area */}
                <div className={`flex-1 overflow-y-auto relative p-6 md:p-8 ${fontFamily === 'serif' ? 'font-serif' : 'font-sans'}`}>
                  <EditorContent 
                    editor={editor} 
                    className={`tiptap-editor ${isDarkMode ? 'tiptap-dark' : ''}`} 
                    style={{ lineHeight: lineHeight }}
                  />
                </div>
              </motion.div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[60vh] opacity-30">
                <FileText className="w-24 h-24 mb-4" />
                <p className="text-xl font-medium">Выберите или создайте заметку</p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className={`absolute -top-24 -left-24 w-96 h-96 rounded-full blur-[100px] opacity-20 transition-colors duration-1000 ${isDarkMode ? 'bg-purple-600' : 'bg-pink-300'}`} />
        <div className={`absolute -bottom-24 -right-24 w-96 h-96 rounded-full blur-[100px] opacity-20 transition-colors duration-1000 ${isDarkMode ? 'bg-blue-600' : 'bg-purple-300'}`} />
      </div>

      {/* Global Modals */}
      <AnimatePresence>
        {deleteConfirmId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`p-6 rounded-3xl shadow-2xl max-w-sm w-full ${
                isDarkMode ? 'bg-purple-900 border border-purple-800' : 'bg-white border border-pink-100'
              }`}
            >
              <h3 className="text-lg font-bold mb-2">Удалить?</h3>
              <p className="text-sm opacity-70 mb-6">Это действие нельзя отменить. Все вложенные файлы также будут удалены.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => deleteNode(deleteConfirmId)}
                  className="flex-1 py-2 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors"
                >
                  Удалить
                </button>
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className={`flex-1 py-2 rounded-xl font-bold transition-colors ${
                    isDarkMode ? 'bg-purple-800 hover:bg-purple-700' : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  Отмена
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
