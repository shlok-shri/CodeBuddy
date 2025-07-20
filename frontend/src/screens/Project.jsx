// Required libraries
import React, { useState, useRef, useEffect, useContext, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import axios from '../config/axios';
import { initializeSocket, receiveMessage, sendMessage } from '../config/socket';
import { userContext } from '../context/user.context';
import Markdown from 'markdown-to-jsx';
import Editor from '@monaco-editor/react';
import { getWebContainer } from '../config/webContainer';

const ProjectUI = () => {
  const { projectId } = useParams();
  const { user } = useContext(userContext);
  const [project, setProject] = useState(null);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(new Set());
  const [message, setMessage] = useState('');
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [currentFile, setCurrentFile] = useState(null);
  const [openFiles, setOpenFiles] = useState([]);
  const [fileTree, setFileTree] = useState({});
  const [webContainer, setWebContainer] = useState(null);
  const [iFrameUrl, setIFrameUrl] = useState(null);
  const [runProcess, setRunProcess] = useState(null);
  const [isFilesPanelOpen, setIsFilesPanelOpen] = useState(true);
  const [isIframeVisible, setIsIframeVisible] = useState(false);
  const [iframeHeight, setIframeHeight] = useState(384);
  const [isResizing, setIsResizing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  // Responsive states
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeView, setActiveView] = useState('editor'); // 'chat', 'files', 'editor', 'preview'
  const [isLandscape, setIsLandscape] = useState(false);

  const messageBoxRef = useRef();
  const saveTimeoutRef = useRef(null);

  // Enhanced responsive breakpoint detection
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const newIsMobile = width < 768;
      const newIsTablet = width >= 768 && width < 1024;
      const newIsLandscape = width > height && newIsMobile;

      setIsMobile(newIsMobile);
      setIsTablet(newIsTablet);
      setIsLandscape(newIsLandscape);

      // Auto-adjust panels based on screen size
      if (newIsMobile) {
        setIsFilesPanelOpen(false);
        setIsChatOpen(false);
        // In mobile landscape, prefer editor view for better code editing
        if (newIsLandscape && activeView === 'chat') {
          setActiveView('editor');
        }
      } else if (width >= 1024) {
        setIsFilesPanelOpen(true);
        // On desktop, we can show chat by default
        setIsChatOpen(true);
      } else {
        // Tablet - keep current state but ensure files panel is closed
        setIsFilesPanelOpen(false);
      }

      // Adjust iframe height for mobile landscape
      if (newIsLandscape && iFrameUrl) {
        setIframeHeight(Math.min(300, height * 0.6));
      }
    };

    checkScreenSize();
    const debouncedCheckScreenSize = debounce(checkScreenSize, 100);
    window.addEventListener('resize', debouncedCheckScreenSize);
    return () => window.removeEventListener('resize', debouncedCheckScreenSize);
  }, [activeView, iFrameUrl]);

  // Debounce utility function
  const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  const getLanguageFromFileName = (filename) => {
    if (filename.endsWith('.js') || filename.endsWith('.jsx')) return 'javascript';
    if (filename.endsWith('.ts') || filename.endsWith('.tsx')) return 'typescript';
    if (filename.endsWith('.json')) return 'json';
    if (filename.endsWith('.html')) return 'html';
    if (filename.endsWith('.css')) return 'css';
    if (filename.endsWith('.scss') || filename.endsWith('.sass')) return 'scss';
    if (filename.endsWith('.py')) return 'python';
    if (filename.endsWith('.md')) return 'markdown';
    if (filename.endsWith('.xml')) return 'xml';
    if (filename.endsWith('.yml') || filename.endsWith('.yaml')) return 'yaml';
    return 'plaintext';
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp || Date.now());
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  function send() {
    if (!user || !message.trim()) return;
    const sent = { message: message.trim(), sender: user, type: 'outgoing', timestamp: Date.now() };
    setMessages(prev => [...prev, sent]);
    sendMessage('project-message', sent);
    setMessage('');
  }

  const appendIncomingMessage = async (msg) => {
    if (
      msg.sender._id === 'ai' &&
      typeof msg.message === 'object' &&
      msg.message.FileTree
    ) {
      console.log('Received AI message with FileTree:', msg.message);
      const newTree = msg.message.FileTree;

      setFileTree(prevTree => {
        const updatedFiles = Object.keys(newTree);
        const updatedTree = {
          ...prevTree,
          ...Object.fromEntries(
            updatedFiles.map(filename => [
              filename,
              { content: newTree[filename]?.file?.contents || '' }
            ])
          )
        };
        return updatedTree;
      });
    }

    setMessages(prev => [...prev, { ...msg, type: 'incoming', timestamp: Date.now() }]);
  };

  const addCollaborators = () => {
    const arr = Array.from(selectedUserId);
    axios
      .put('/projects/add-user', { projectId, users: arr }, { withCredentials: true })
      .then(() => axios.get(`/projects/${projectId}`))
      .then(res => {
        setProject(res.data.project);
        setIsModalOpen(false);
        setSelectedUserId(new Set());
      })
      .catch(console.error);
  };

  const saveFileTree = useCallback(async (ft) => {
    if (!project || !ft || Object.keys(ft).length === 0) {
      console.log('Cannot save: missing project or empty fileTree');
      return;
    }

    try {
      setIsSaving(true);
      console.log('Saving fileTree:', ft);

      const response = await axios.put('/projects/update-fileTree', {
        projectId: project._id,
        fileTree: ft
      }, { withCredentials: true });

      console.log('✅ File tree saved successfully:', response.data);
      setLastSaved(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('❌ Error saving file tree:', err);
      console.error('Error details:', err.response?.data || err.message);
    } finally {
      setIsSaving(false);
    }
  }, [project]);

  const debouncedSave = useCallback((ft) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveFileTree(ft);
    }, 1000);
  }, [saveFileTree]);

  const handleFileChange = useCallback((newContent) => {
    if (!currentFile) return;

    const updatedFileTree = {
      ...fileTree,
      [currentFile]: {
        content: newContent
      }
    };

    setFileTree(updatedFileTree);
    debouncedSave(updatedFileTree);
  }, [currentFile, fileTree, debouncedSave]);

  useEffect(() => {
    axios.get(`/projects/${projectId}`, { withCredentials: true }).then(res => {
      setProject(res.data.project);
      console.log('Loaded project:', res.data.project);

      if (res.data.project.fileTree) {
        setFileTree(res.data.project.fileTree);
        console.log('Loaded fileTree:', res.data.project.fileTree);
      } else {
        console.log('No fileTree found in project');
      }
    }).catch(console.error);

    axios.get('/users/all', { withCredentials: true }).then(res => setUsers(res.data.users)).catch(console.error);
  }, [projectId]);

  useEffect(() => {
    if (!project) return;

    if (!webContainer) {
      getWebContainer().then(container => {
        setWebContainer(container);
        console.log('WebContainer initialized:', container);
        container.on('error', (err) => console.error('WebContainer error:', err));
      }).catch(err => console.error('Failed to initialize WebContainer:', err));
    }

    initializeSocket(project._id);
    receiveMessage('project-message', data => {
      if (data.sender.email !== user.email) {
        appendIncomingMessage(data);
      }
    });
  }, [project, user]);

  useEffect(() => {
    if (messageBoxRef.current) {
      messageBoxRef.current.scrollTop = messageBoxRef.current.scrollHeight;
    }
  }, [messages]);

  const extractMessage = (msg) => {
    if (msg.sender._id === 'ai') {
      if (typeof msg.message === 'object' && msg.message.text) {
        return msg.message.text;
      }
      if (typeof msg.message === 'string') {
        try {
          const parsed = JSON.parse(msg.message);
          return parsed.text || msg.message;
        } catch {
          return msg.message;
        }
      }
    }
    return typeof msg.message === 'string' ? msg.message : JSON.stringify(msg.message);
  };

  useEffect(() => {
    const mountFiles = async () => {
      if (!webContainer || !fileTree || Object.keys(fileTree).length === 0) {
        console.log('WebContainer not ready or fileTree empty, skipping mount');
        return;
      }

      try {
        const mountableFiles = Object.entries(fileTree).reduce((acc, [filename, fileObj]) => {
          acc[filename] = {
            file: {
              contents: fileObj?.content || '',
            },
          };
          return acc;
        }, {});

        console.log('fileTree before mount:', fileTree);
        await webContainer.mount(mountableFiles);
        console.log('✅ Mounted files successfully to WebContainer');
      } catch (err) {
        console.error('❌ Error mounting files:', err);
      }
    };

    mountFiles();
  }, [webContainer, fileTree]);

  useEffect(() => {
    if (iFrameUrl) {
      setIsIframeVisible(true);
    } else {
      setIsIframeVisible(false);
    }
  }, [iFrameUrl]);

  // Enhanced iframe resizing for better mobile experience
  const handleMouseDown = (e) => {
    if (isMobile) return; // Disable resizing on mobile
    setIsResizing(true);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e) => {
    if (!isResizing || isMobile) return;
    const newHeight = window.innerHeight - e.clientY;
    const minHeight = isTablet ? 150 : 200;
    const maxHeight = window.innerHeight - (isTablet ? 50 : 100);
    setIframeHeight(Math.max(minHeight, Math.min(newHeight, maxHeight)));
  };

  const handleMouseUp = () => {
    setIsResizing(false);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Enhanced keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Save shortcut
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        saveFileTree(fileTree);
      }

      // Mobile view switching shortcuts
      if (isMobile && e.altKey) {
        switch (e.key) {
          case '1':
            setActiveView('chat');
            break;
          case '2':
            setActiveView('files');
            break;
          case '3':
            setActiveView('editor');
            break;
          case '4':
            if (iFrameUrl) setActiveView('preview');
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [fileTree, saveFileTree, isMobile, iFrameUrl]);

  const runCode = async () => {
    try {
      console.log('🚀 Starting to run code...');

      // Kill existing process if running
      if (runProcess) {
        console.log('⏹️ Killing existing process...');
        runProcess.kill();
        setRunProcess(null);
        setIFrameUrl(null);
        setIsIframeVisible(false);
        return; // Just stop if already running
      }

      console.log('📦 Installing dependencies...');
      const installProcess = await webContainer.spawn("npm", ["install"]);

      // Wait for install to complete
      const installExitCode = await installProcess.exit;
      console.log('📦 Install completed with exit code:', installExitCode);

      console.log('🏃 Starting development server...');
      const tempRunProcess = await webContainer.spawn("npm", ["start"]);

      tempRunProcess.output.pipeTo(new WritableStream({
        write(chunk) {
          console.log('🖥️ Server Output:', chunk);
        }
      }));

      setRunProcess(tempRunProcess);

      // Listen for server-ready event
      const serverReadyHandler = (port, url) => {
        console.log('✅ Server is ready at:', url, 'on port:', port);
        setIFrameUrl(url);
        setIsIframeVisible(true);

        // Auto-switch to preview on mobile when server is ready
        if (isMobile) {
          setActiveView('preview');
        }
      };

      webContainer.on('server-ready', serverReadyHandler);

      // Cleanup function to remove event listener
      tempRunProcess.exit.then(() => {
        webContainer.off('server-ready', serverReadyHandler);
      });

    } catch (error) {
      console.error('❌ Error running code:', error);
      setRunProcess(null);
    }
  };

  return (
    <main className="h-screen w-screen flex flex-col lg:flex-row bg-slate-900 text-white overflow-hidden">
      {/* Enhanced Mobile Navigation Bar */}
      {isMobile && (
        <div className={`flex bg-slate-800 border-b border-slate-700 p-2 gap-1 overflow-x-auto ${isLandscape ? 'py-1' : 'py-2'
          }`}>
          <button
            onClick={() => setActiveView('chat')}
            className={`flex items-center gap-1 px-3 py-2 rounded text-xs whitespace-nowrap transition-colors ${activeView === 'chat' ? 'bg-blue-600 text-white' : 'bg-slate-700 hover:bg-slate-600'
              }`}
          >
            <i className="ri-chat-3-line" />
            <span className={isLandscape ? 'hidden' : ''}>Chat</span>
            {messages.length > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full px-1 min-w-[16px] h-4 flex items-center justify-center">
                {messages.length > 99 ? '99+' : messages.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveView('files')}
            className={`flex items-center gap-1 px-3 py-2 rounded text-xs whitespace-nowrap transition-colors ${activeView === 'files' ? 'bg-blue-600 text-white' : 'bg-slate-700 hover:bg-slate-600'
              }`}
          >
            <i className="ri-folder-line" />
            <span className={isLandscape ? 'hidden' : ''}>Files</span>
          </button>
          <button
            onClick={() => setActiveView('editor')}
            className={`flex items-center gap-1 px-3 py-2 rounded text-xs whitespace-nowrap transition-colors ${activeView === 'editor' ? 'bg-blue-600 text-white' : 'bg-slate-700 hover:bg-slate-600'
              }`}
          >
            <i className="ri-code-line" />
            <span className={isLandscape ? 'hidden' : ''}>Editor</span>
          </button>
          {iFrameUrl && (
            <button
              onClick={() => setActiveView('preview')}
              className={`flex items-center gap-1 px-3 py-2 rounded text-xs whitespace-nowrap transition-colors ${activeView === 'preview' ? 'bg-blue-600 text-white' : 'bg-slate-700 hover:bg-slate-600'
                }`}
            >
              <i className="ri-global-line" />
              <span className={isLandscape ? 'hidden' : ''}>Preview</span>
            </button>
          )}
        </div>
      )}

      {/* Enhanced Chat Section */}
      <section className={`
        flex flex-col bg-slate-800 border-r border-slate-700
        ${isMobile
          ? `${activeView === 'chat' ? 'flex' : 'hidden'} w-full h-full`
          : isTablet
            ? `${isChatOpen ? 'w-80 min-w-80' : 'w-0 overflow-hidden'} transition-all duration-300`
            : 'w-80 min-w-80 max-w-80'
        }
      `}>
        <header className={`flex justify-between items-center p-3 lg:p-4 bg-slate-700 border-b border-slate-600 ${isMobile && isLandscape ? 'py-2' : ''
          }`}>
          <button
            onClick={() => setIsModalOpen(true)}
            className="hover:text-blue-400 flex items-center gap-2 text-xs lg:text-sm transition-colors"
          >
            <i className="ri-add-fill" />
            <span className={`${isMobile && isLandscape ? 'hidden' : 'hidden sm:inline'}`}>
              Add Collaborator
            </span>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSidePanelOpen(o => !o)}
              className="hover:text-blue-400 transition-colors"
              title="Show users"
            >
              <i className="ri-group-fill" />
            </button>
            {(isTablet || isMobile) && (
              <button
                onClick={() => isMobile ? setActiveView('editor') : setIsChatOpen(false)}
                className="hover:text-red-400 lg:hidden transition-colors"
                title="Close chat"
              >
                <i className="ri-close-fill" />
              </button>
            )}
          </div>
        </header>

        {/* Enhanced Side Panel */}
        {isSidePanelOpen && (
          <div className="absolute inset-0 bg-slate-800 z-20 p-4 h-full overflow-y-auto w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg lg:text-xl font-semibold">Collaborators</h2>
              <button
                onClick={() => setIsSidePanelOpen(false)}
                className="hover:text-red-400 transition-colors"
              >
                <i className="ri-close-fill text-xl" />
              </button>
            </div>
            <div className="space-y-2 overflow-auto">
              {project?.users.map(u => (
                <div key={u._id} className="p-3 bg-slate-700 rounded-lg text-sm hover:bg-slate-600 transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {u.email.charAt(0).toUpperCase()}
                    </div>
                    <span>{u.email}</span>
                  </div>
                </div>
              ))}
              {(!project?.users || project.users.length === 0) && (
                <div className="text-slate-400 text-center py-8">
                  No collaborators yet
                </div>
              )}
            </div>
          </div>
        )}

        {/* Enhanced Messages Container */}
        <div
          ref={messageBoxRef}
          className={`flex-grow p-3 lg:p-4 overflow-y-auto space-y-3 lg:space-y-4 flex flex-col ${isMobile && isLandscape ? 'p-2 space-y-2' : ''
            }`}
        >
          {messages.length === 0 && (
            <div className="text-center text-slate-400 py-8">
              <i className="ri-chat-3-line text-3xl mb-2 block" />
              <p>Start a conversation with your team</p>
            </div>
          )}
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.type === 'outgoing' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] lg:max-w-[75%] ${msg.type === 'outgoing' ? 'flex flex-col items-end' : 'flex flex-col items-start'}`}>
                <div className={`inline-block p-2 lg:p-3 break-words text-white text-xs lg:text-sm shadow-lg ${msg.type === 'outgoing'
                  ? 'bg-blue-600 rounded-2xl rounded-br-sm'
                  : msg.sender._id === 'ai'
                    ? 'bg-green-600 rounded-2xl rounded-bl-sm'
                    : 'bg-slate-700 rounded-2xl rounded-bl-sm'
                  } ${isMobile && isLandscape ? 'p-2 text-xs' : ''}`}>
                  <small className="block mb-1 text-xs opacity-75 font-medium">
                    {msg.sender._id === 'ai' ? 'AI Assistant' : msg.type === 'outgoing' ? 'You' : msg.sender.email}
                  </small>
                  <div className="prose prose-sm max-w-none text-white prose-code:text-blue-200 prose-pre:bg-slate-800">
                    <Markdown>{extractMessage(msg)}</Markdown>
                  </div>
                </div>
                <span className="text-xs text-slate-400 mt-1 px-2">
                  {formatTimestamp(msg.timestamp)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Enhanced Message Input */}
        <div className={`flex border-t border-slate-700 p-2 lg:p-3 bg-slate-800 ${isMobile && isLandscape ? 'p-2' : ''
          }`}>
          <input
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && send()}
            className={`flex-grow p-2 lg:p-3 bg-slate-700 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all ${isMobile && isLandscape ? 'p-2 text-xs' : ''
              }`}
            placeholder="Type your message..."
            maxLength={1000}
          />
          <button
            onClick={send}
            className={`px-3 lg:px-4 bg-blue-600 hover:bg-blue-700 rounded-r-lg transition-colors ${message.trim() ? 'opacity-100' : 'opacity-50'
              }`}
            disabled={!message.trim()}
            title="Send message"
          >
            <i className="ri-send-plane-fill" />
          </button>
        </div>
      </section>

      {/* Enhanced Main Content Area */}
      <section className={`
        bg-slate-900 flex-grow flex flex-col relative overflow-hidden
        ${isMobile ? (activeView === 'chat' ? 'hidden' : 'flex') : 'flex'}
      `}>
        {/* Enhanced Tablet Chat Toggle */}
        {isTablet && !isChatOpen && (
          <button
            onClick={() => setIsChatOpen(true)}
            className="fixed top-4 left-4 z-30 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg shadow-lg transition-all hover:scale-105"
            title="Open chat"
          >
            <i className="ri-chat-3-line" />
            {messages.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {messages.length > 9 ? '9+' : messages.length}
              </span>
            )}
          </button>
        )}

        {/* Mobile Files View - Full screen when active */}
        {isMobile && activeView === 'files' && (
          <div className="w-full h-full bg-slate-600 flex flex-col">
            <div className="flex items-center justify-between p-3 bg-slate-700 border-b border-slate-600">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <i className="ri-folder-open-line" />
                Files
              </h3>
              <button
                onClick={() => setActiveView('editor')}
                className="hover:text-red-400 text-slate-400 transition-colors"
                title="Close files panel"
              >
                <i className="ri-close-fill" />
              </button>
            </div>
            <div className="flex-grow overflow-y-auto">
              {fileTree && Object.keys(fileTree).length > 0 ? (
                Object.keys(fileTree).map((file, index) => (
                  <button
                    className={`w-full hover:bg-slate-500 transition-colors ${currentFile === file ? 'bg-blue-600/20 border-r-2 border-blue-500' : ''
                      }`}
                    key={index}
                    onClick={() => {
                      setCurrentFile(file);
                      setOpenFiles(prev => (!prev.includes(file) ? [...prev, file] : prev));
                      setActiveView('editor'); // Auto-switch to editor after selecting file
                    }}
                    title={file}
                  >
                    <div className="p-3 px-4 cursor-pointer items-center flex gap-2 text-left">
                      <p className="text-sm text-slate-300 hover:text-white truncate">
                        {file}
                      </p>
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-4 text-center text-slate-400">
                  <i className="ri-file-add-line text-2xl mb-2 block" />
                  <p className="text-sm">No files yet</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mobile Preview View - Full screen when active */}
        {isMobile && activeView === 'preview' && (
          <div className="w-full h-full bg-slate-900 flex flex-col">
            <div className="flex items-center justify-between p-3 bg-slate-700 border-b border-slate-600">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <i className="ri-global-line" />
                Preview
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (runProcess) {
                      runProcess.kill();
                      setRunProcess(null);
                      setIFrameUrl(null);
                      setIsIframeVisible(false);
                      setActiveView('editor');
                    }
                  }}
                  className="hover:text-red-400 text-slate-400 transition-colors"
                  title="Stop preview"
                >
                  <i className="ri-stop-fill" />
                </button>
                <button
                  onClick={() => setActiveView('editor')}
                  className="hover:text-red-400 text-slate-400 transition-colors"
                  title="Close preview"
                >
                  <i className="ri-close-fill" />
                </button>
              </div>
            </div>
            <div className="flex-grow">
              {iFrameUrl ? (
                <iframe
                  src={iFrameUrl}
                  className="w-full h-full border-0"
                  title="Project Preview"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-downloads"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400">
                  <div className="text-center">
                    <i className="ri-play-circle-line text-4xl mb-2 block" />
                    <p>Click run to start preview</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Desktop/Tablet Layout - Editor and Files */}
        {(!isMobile || activeView === 'editor') && (
          <div className="flex h-full">
            {/* Enhanced Files Panel */}
            <aside className={`
              bg-slate-600 border-r border-slate-700 transition-all duration-300 overflow-hidden
              ${isMobile
                ? 'hidden'
                : isFilesPanelOpen
                  ? 'w-64 min-w-64'
                  : 'w-0'
              }
            `}>
              <div className="flex items-center justify-between p-3 bg-slate-700 border-b border-slate-600">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <i className="ri-folder-open-line" />
                  Files
                </h3>
                <button
                  onClick={() => setIsFilesPanelOpen(false)}
                  className="hover:text-red-400 text-slate-400 lg:hidden transition-colors"
                  title="Close files panel"
                >
                  <i className="ri-close-fill" />
                </button>
              </div>
              <div className="overflow-y-auto h-full">
                {fileTree && Object.keys(fileTree).length > 0 ? (
                  Object.keys(fileTree).map((file, index) => (
                    <button
                      className={`w-full hover:bg-slate-500 transition-colors ${currentFile === file ? 'bg-blue-600/20 border-r-2 border-blue-500' : ''
                        }`}
                      key={index}
                      onClick={() => {
                        setCurrentFile(file);
                        setOpenFiles(prev => (!prev.includes(file) ? [...prev, file] : prev));
                      }}
                      title={file}
                    >
                      <div className="p-3 px-4 cursor-pointer items-center flex gap-2 text-left">
                        <i className={`ri-file-${getLanguageFromFileName(file) === 'javascript' ? 'code' : 'text'}-line text-slate-400`} />
                        <p className="text-sm text-slate-300 hover:text-white truncate">
                          {file}
                        </p>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center text-slate-400">
                    <i className="ri-file-add-line text-2xl mb-2 block" />
                    <p className="text-sm">No files yet</p>
                    <p className="text-xs mt-1">Send a message to AI to generate files</p>
                  </div>
                )}
              </div>
            </aside>

            {/* Enhanced Code Editor Section */}
            <div className="flex-grow flex flex-col relative">
              {/* Enhanced Editor Header with Tabs and Controls */}
              <header className="flex items-center justify-between bg-slate-800 border-b border-slate-700 px-3 py-2">
                <div className="flex items-center gap-2">
                  {!isFilesPanelOpen && !isMobile && (
                    <button
                      onClick={() => setIsFilesPanelOpen(true)}
                      className="hover:text-blue-400 text-slate-400 transition-colors mr-2"
                      title="Show files panel"
                    >
                      <i className="ri-folder-line" />
                    </button>
                  )}

                  {/* File Tabs */}
                  <div className="flex items-center gap-1 overflow-x-auto max-w-md">
                    {openFiles.map((file, index) => (
                      <div
                        key={index}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-xs whitespace-nowrap transition-colors ${currentFile === file
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          }`}
                      >
                        <button
                          onClick={() => setCurrentFile(file)}
                          className="flex items-center gap-1"
                        >
                          <i className={`ri-file-${getLanguageFromFileName(file) === 'javascript' ? 'code' : 'text'}-line`} />
                          <span className="max-w-20 truncate">{file}</span>
                        </button>
                        <button
                          onClick={() => {
                            setOpenFiles(prev => prev.filter(f => f !== file));
                            if (currentFile === file) {
                              const remainingFiles = openFiles.filter(f => f !== file);
                              setCurrentFile(remainingFiles.length > 0 ? remainingFiles[0] : null);
                            }
                          }}
                          className="hover:text-red-400 ml-1"
                          title="Close file"
                        >
                          <i className="ri-close-line text-xs" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Save Status */}
                  {isSaving && (
                    <div className="flex items-center gap-1 text-xs text-blue-400">
                      <i className="ri-refresh-line animate-spin" />
                      <span>Saving...</span>
                    </div>
                  )}
                  {lastSaved && !isSaving && (
                    <div className="text-xs text-green-400" title="Last saved time">
                      <i className="ri-check-line" />
                      <span className="ml-1">{lastSaved}</span>
                    </div>
                  )}
                </div>

                {/* Enhanced Control Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={runCode}
                    className={`px-3 py-1 rounded text-xs font-medium transition-all flex items-center gap-1 ${runProcess
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-green-600 hover:bg-green-700 text-white hover:scale-105'
                      }`}
                    title={runProcess ? 'Stop application' : 'Run application'}
                  >
                    <i className={`ri-${runProcess ? 'stop' : 'play'}-fill`} />
                    <span className={isMobile && isLandscape ? 'hidden' : ''}>
                      {runProcess ? 'Stop' : 'Run'}
                    </span>
                  </button>

                  {/* Mobile-specific controls */}
                  {isMobile && (
                    <button
                      onClick={() => setActiveView('files')}
                      className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs transition-colors"
                      title="Show files"
                    >
                      <i className="ri-folder-line" />
                    </button>
                  )}
                </div>
              </header>

              {/* Enhanced Code Editor */}
              <div className="flex-grow relative">
                {currentFile ? (
                  <Editor
                    height="100%"
                    language={getLanguageFromFileName(currentFile)}
                    value={fileTree[currentFile]?.content || ''}
                    onChange={handleFileChange}
                    theme="vs-dark"
                    options={{
                      fontSize: isMobile ? 12 : 14,
                      lineHeight: isMobile ? 16 : 20,
                      padding: { top: 10, bottom: 10 },
                      scrollBeyondLastLine: false,
                      minimap: { enabled: !isMobile && !isTablet },
                      lineNumbers: 'on',
                      glyphMargin: false,
                      folding: !isMobile,
                      lineDecorationsWidth: isMobile ? 5 : 10,
                      lineNumbersMinChars: 3,
                      wordWrap: isMobile ? 'on' : 'off',
                      automaticLayout: true,
                      contextmenu: !isMobile,
                      quickSuggestions: !isMobile,
                      suggestOnTriggerCharacters: !isMobile,
                      acceptSuggestionOnEnter: isMobile ? 'off' : 'on',
                      tabSize: 2,
                      insertSpaces: true,
                      detectIndentation: false,
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-400 bg-slate-900">
                    <div className="text-center">
                      <i className="ri-code-s-slash-line text-4xl mb-2 block" />
                      <p className="text-lg mb-2">No file selected</p>
                      <p className="text-sm">
                        {Object.keys(fileTree).length === 0
                          ? 'Chat with AI to generate files'
                          : 'Select a file from the files panel'
                        }
                      </p>
                      {!isMobile && !isFilesPanelOpen && Object.keys(fileTree).length > 0 && (
                        <button
                          onClick={() => setIsFilesPanelOpen(true)}
                          className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors text-sm"
                        >
                          Show Files
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Enhanced Preview Panel with Resizing */}
              {isIframeVisible && !isMobile && (
                <>
                  {/* Resize Handle */}
                  <div
                    className={`h-1 bg-slate-700 cursor-row-resize hover:bg-slate-600 transition-colors ${isResizing ? 'bg-blue-500' : ''
                      }`}
                    onMouseDown={handleMouseDown}
                    title="Drag to resize preview"
                  />

                  {/* Preview Container */}
                  <div
                    className="bg-white border-t border-slate-700 relative"
                    style={{ height: `${iframeHeight}px` }}
                  >
                    <div className="absolute top-0 left-0 right-0 bg-slate-800 text-white px-3 py-1 text-xs flex items-center justify-between z-10">
                      <span className="flex items-center gap-2">
                        <i className="ri-global-line" />
                        Preview
                        {iFrameUrl && (
                          <span className="text-blue-400 font-mono text-xs">{iFrameUrl}</span>
                        )}
                      </span>
                      <button
                        onClick={() => {
                          setIFrameUrl(null);
                          setIsIframeVisible(false);
                          if (runProcess) {
                            runProcess.kill();
                            setRunProcess(null);
                          }
                        }}
                        className="hover:text-red-400 transition-colors"
                        title="Close preview"
                      >
                        <i className="ri-close-fill" />
                      </button>
                    </div>
                    <iframe
                      src={iFrameUrl}
                      className="w-full h-full border-0 pt-8"
                      title="Project Preview"
                      sandbox="allow-scripts allow-same-origin allow-forms allow-downloads"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Enhanced Add Collaborators Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg w-full max-w-md max-h-[80vh] flex flex-col">
            <header className="flex justify-between items-center p-4 border-b border-slate-700">
              <h2 className="text-lg font-semibold">Add Collaborators</h2>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setSelectedUserId(new Set());
                }}
                className="hover:text-red-400 transition-colors"
              >
                <i className="ri-close-fill text-xl" />
              </button>
            </header>

            <div className="flex-grow overflow-y-auto p-4">
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {users
                  .filter(u => !project?.users.some(pu => pu._id === u._id))
                  .map(u => (
                    <label
                      key={u._id}
                      className="flex items-center gap-3 p-3 bg-slate-700 rounded-lg hover:bg-slate-600 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedUserId.has(u._id)}
                        onChange={e => {
                          const newSet = new Set(selectedUserId);
                          if (e.target.checked) {
                            newSet.add(u._id);
                          } else {
                            newSet.delete(u._id);
                          }
                          setSelectedUserId(newSet);
                        }}
                        className="w-4 h-4 text-blue-600 bg-slate-600 border-slate-500 rounded focus:ring-blue-500 focus:ring-2"
                      />
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                          {u.email.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm">{u.email}</span>
                      </div>
                    </label>
                  ))}
              </div>

              {users.filter(u => !project?.users.some(pu => pu._id === u._id)).length === 0 && (
                <div className="text-center text-slate-400 py-8">
                  <i className="ri-user-line text-3xl mb-2 block" />
                  <p>No users available to add</p>
                </div>
              )}
            </div>

            <footer className="p-4 border-t border-slate-700 flex gap-2 justify-end">
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setSelectedUserId(new Set());
                }}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={addCollaborators}
                disabled={selectedUserId.size === 0}
                className={`px-4 py-2 rounded transition-colors ${selectedUserId.size > 0
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                  }`}
              >
                Add {selectedUserId.size > 0 ? `(${selectedUserId.size})` : ''}
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* Enhanced Loading Overlay */}
      {!project && (
        <div className="fixed inset-0 bg-slate-900 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-slate-400">Loading project...</p>
          </div>
        </div>
      )}

      {/* Enhanced Mobile Helper Tips */}
      {isMobile && (
        <div className="fixed bottom-4 right-4 z-40">
          <div className="bg-slate-800 rounded-lg p-2 shadow-lg border border-slate-700 text-xs max-w-48">
            <p className="text-slate-300 mb-1">
              <strong>Tip:</strong> Use Alt + 1-4 for quick view switching
            </p>
            <p className="text-slate-400">
              Ctrl+S to save • Swipe for navigation
            </p>
          </div>
        </div>
      )}
    </main>
  );
};

export default ProjectUI;