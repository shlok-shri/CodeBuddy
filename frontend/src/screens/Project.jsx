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
  const messageBoxRef = useRef();
  const saveTimeoutRef = useRef(null);

  const getLanguageFromFileName = (filename) => {
    if (filename.endsWith('.js')) return 'javascript';
    if (filename.endsWith('.json')) return 'json';
    if (filename.endsWith('.html')) return 'html';
    if (filename.endsWith('.css')) return 'css';
    if (filename.endsWith('.py')) return 'python';
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

      // Update fileTree in React state
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

    // Append message to chat with timestamp
    setMessages(prev => [...prev, { ...msg, type: 'incoming', timestamp: Date.now() }]);
  };

  const addCollaborators = () => {
    const arr = Array.from(selectedUserId);
    axios
      .put('/projects/add-user', { projectId, users: arr })
      .then(() => axios.get(`/projects/${projectId}`))
      .then(res => {
        setProject(res.data.project);
        setIsModalOpen(false);
        setSelectedUserId(new Set());
      })
      .catch(console.error);
  };

  // Fixed saveFileTree function with better error handling and logging
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
      });
      
      console.log('✅ File tree saved successfully:', response.data);
      setLastSaved(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('❌ Error saving file tree:', err);
      console.error('Error details:', err.response?.data || err.message);
    } finally {
      setIsSaving(false);
    }
  }, [project]);

  // Debounced save function
  const debouncedSave = useCallback((ft) => {
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout
    saveTimeoutRef.current = setTimeout(() => {
      saveFileTree(ft);
    }, 1000); // Save 1 second after user stops typing
  }, [saveFileTree]);

  // Handle file content change
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
    axios.get(`/projects/${projectId}`).then(res => {
      setProject(res.data.project);
      console.log('Loaded project:', res.data.project);
      
      // Make sure fileTree is properly set
      if (res.data.project.fileTree) {
        setFileTree(res.data.project.fileTree);
        console.log('Loaded fileTree:', res.data.project.fileTree);
      } else {
        console.log('No fileTree found in project');
      }
    }).catch(console.error);
    
    axios.get('/users/all').then(res => setUsers(res.data.users)).catch(console.error);
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

  // Handle iframe visibility with slide animation
  useEffect(() => {
    if (iFrameUrl) {
      setIsIframeVisible(true);
    } else {
      setIsIframeVisible(false);
    }
  }, [iFrameUrl]);

  // Handle iframe resizing
  const handleMouseDown = (e) => {
    setIsResizing(true);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e) => {
    if (!isResizing) return;
    const newHeight = window.innerHeight - e.clientY;
    setIframeHeight(Math.max(200, Math.min(newHeight, window.innerHeight - 100)));
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
      // Clean up timeout on unmount
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Manual save function (Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        saveFileTree(fileTree);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [fileTree, saveFileTree]);

  return (
    <main className="h-screen w-screen flex bg-slate-900 text-white">
      {/* Chat Section - Fixed to extreme left */}
      <section className="flex left flex-col bg-slate-800 w-80 min-w-80 max-w-80 border-r border-slate-700">
        <header className="flex justify-between items-center p-4 bg-slate-700 sticky top-0 border-b border-slate-600">
          <button onClick={() => setIsModalOpen(true)} className="hover:text-blue-400 flex items-center gap-2 text-sm">
            <i className="ri-add-fill" /> Add Collaborator
          </button>
          <button onClick={() => setIsSidePanelOpen(o => !o)} className="hover:text-blue-400">
            <i className="ri-group-fill" />
          </button>
        </header>

        {isSidePanelOpen && (
          <div className="absolute inset-0 bg-slate-800 z-20 p-4 h-full overflow-y-auto scrollbar-hide w-80">
            <div className="flex justify-between mb-4">
              <h2 className="text-xl">Users</h2>
              <button onClick={() => setIsSidePanelOpen(false)}>
                <i className="ri-close-fill" />
              </button>
            </div>
            <div className="space-y-2 overflow-auto">
              {project?.users.map(u => (
                <div key={u._id} className="p-2 bg-slate-700 rounded">{u.email}</div>
              ))}
            </div>
          </div>
        )}

        <div ref={messageBoxRef} className="flex-grow p-4 overflow-y-auto space-y-4 flex flex-col">
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.type === 'outgoing' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] ${msg.type === 'outgoing' ? 'flex flex-col items-end' : 'flex flex-col items-start'}`}>
                <div className={`inline-block p-3 break-words text-white text-sm shadow-lg ${
                  msg.type === 'outgoing' 
                    ? 'bg-blue-600 rounded-2xl rounded-br-sm' 
                    : msg.sender._id === 'ai' 
                      ? 'bg-green-600 rounded-2xl rounded-bl-sm' 
                      : 'bg-slate-700 rounded-2xl rounded-bl-sm'
                }`}>
                  <small className="block mb-1 text-xs opacity-75 font-medium">
                    {msg.sender._id === 'ai' ? 'AI Assistant' : msg.type === 'outgoing' ? 'You' : msg.sender.email}
                  </small>
                  <Markdown>{extractMessage(msg)}</Markdown>
                </div>
                <span className="text-xs text-slate-400 mt-1 px-2">
                  {formatTimestamp(msg.timestamp)}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex border-t border-slate-700 p-3 bg-slate-800">
          <input
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && send()}
            className="flex-grow p-3 bg-slate-700 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Type your message..."
          />
          <button onClick={send} className="px-4 bg-blue-600 hover:bg-blue-700 rounded-r-lg transition-colors">
            <i className="ri-send-plane-fill" />
          </button>
        </div>
      </section>

      {/* Main Content Area */}
      <section className="right bg-slate-900 flex-grow h-full flex flex-col relative">
        <div className="flex flex-grow">
          {/* File Explorer - Collapsible */}
          <div className={`transition-all duration-300 bg-slate-600 border-r border-slate-700 ${isFilesPanelOpen ? 'w-64' : 'w-0 overflow-hidden'}`}>
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between p-3 bg-slate-700 border-b border-slate-600">
                <h3 className="text-sm font-medium">Files</h3>
                <button 
                  onClick={() => setIsFilesPanelOpen(false)}
                  className="hover:text-red-400 text-slate-400"
                >
                  <i className="ri-close-fill" />
                </button>
              </div>
              <div className="flex-grow overflow-y-auto">
                {fileTree && Object.keys(fileTree).map((file, index) => (
                  <button 
                    className="fileTree w-full hover:bg-slate-500 transition-colors" 
                    key={index} 
                    onClick={() => {
                      setCurrentFile(file);
                      setOpenFiles(prev => (!prev.includes(file) ? [...prev, file] : prev));
                    }}
                  >
                    <div className="treeElement p-3 px-4 cursor-pointer items-center flex gap-2 text-left">
                      <i className="ri-file-text-line text-slate-400" />
                      <p className="text-sm text-slate-300 hover:text-white truncate">{file}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Code Editor Area */}
          <div className="codeEditor flex flex-col flex-grow h-full bg-slate-900">
            <div className="top flex justify-between items-center bg-slate-800 border-b border-slate-700">
              <div className="flex items-center">
                {!isFilesPanelOpen && (
                  <button 
                    onClick={() => setIsFilesPanelOpen(true)}
                    className="p-2 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                  >
                    <i className="ri-menu-line" />
                  </button>
                )}
                
                <div className="files flex overflow-x-auto">
                  {openFiles.map((file, index) => (
                    <div key={index} className={`flex items-center whitespace-nowrap border-r border-slate-700 ${
                      currentFile === file ? 'bg-blue-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    } transition-colors`}>
                      <span className="text-sm px-4 py-2 cursor-pointer" onClick={() => setCurrentFile(file)}>
                        {file}
                      </span>
                      <button
                        className="px-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-colors"
                        onClick={() => setOpenFiles(prev => prev.filter(f => f !== file))}
                      >
                        <i className="ri-close-fill text-xs" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="actions flex gap-2 p-2 items-center">
                {/* Save status indicator */}
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  {isSaving ? (
                    <span className="flex items-center gap-1">
                      <i className="ri-loader-4-line animate-spin" />
                      Saving...
                    </span>
                  ) : lastSaved ? (
                    <span>Saved at {lastSaved}</span>
                  ) : null}
                </div>

                <button
                  onClick={async () => {
                    const installProcess = await webContainer.spawn("npm", ["install"]);
                    installProcess.output.pipeTo(new WritableStream({
                      write(chunk) {
                        console.log('Output:', chunk);
                      }
                    }));

                    if (runProcess) {
                      runProcess.kill();
                      setRunProcess(null);
                    }
                    const tempRunProcess = await webContainer.spawn("npm", ["start"]);
                    tempRunProcess.output.pipeTo(new WritableStream({
                      write(chunk) {
                        console.log('Output:', chunk);
                      }
                    }));
                    setRunProcess(tempRunProcess);

                    webContainer.on('server-ready', (port, url) => {
                      console.log('Server is ready at:', url, port);
                      setIFrameUrl(url);
                    });
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                >
                  <i className="ri-play-fill" />
                  Run
                </button>
              </div>
            </div>

            <div className="bottom flex-grow">
              {fileTree && fileTree[currentFile] && (
                <Editor
                  height="100%"
                  language={getLanguageFromFileName(currentFile)}
                  theme="vs-dark"
                  value={fileTree[currentFile].content}
                  onChange={handleFileChange}
                  options={{
                    tabSize: 2,
                    fontSize: 14,
                    minimap: { enabled: false },
                    automaticLayout: true,
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                    quickSuggestions: false,
                    suggestOnTriggerCharacters: false,
                    codeLens: false,
                    formatOnType: false,
                    formatOnPaste: false,
                    validate: false
                  }}
                  onMount={(editor, monaco) => {
                    monaco.languages.html.htmlDefaults.setOptions({
                      format: { indentInnerHtml: true },
                      validate: false,
                    });
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Iframe Preview - Slides up from bottom with resizable functionality */}
        {iFrameUrl && webContainer && (
          <div 
            className={`absolute bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 transition-all duration-500 ease-out ${
              isIframeVisible ? 'translate-y-0' : 'translate-y-full'
            }`}
            style={{ height: isIframeVisible ? `${iframeHeight}px` : '0px' }}
          >
            {/* Resize handle */}
            <div
              className="absolute top-0 left-0 right-0 h-1 bg-slate-600 hover:bg-blue-500 cursor-ns-resize transition-colors"
              onMouseDown={handleMouseDown}
            />
            
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between p-3 bg-slate-700 border-b border-slate-600">
                <div className="flex items-center gap-2 flex-grow">
                  <i className="ri-global-line text-slate-400" />
                  <input
                    value={iFrameUrl}
                    onChange={(e) => setIFrameUrl(e.target.value)}
                    className="flex-grow p-2 bg-slate-600 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    type="text"
                  />
                </div>
                <button
                  onClick={() => setIFrameUrl(null)}
                  className="ml-2 p-2 hover:bg-slate-600 rounded text-slate-400 hover:text-white transition-colors"
                >
                  <i className="ri-close-fill" />
                </button>
              </div>
              <div className="flex-grow">
                <iframe
                  src={iFrameUrl}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  title="Preview"
                />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Modal for adding collaborators */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800 p-6 rounded-xl shadow-2xl w-full max-w-md border border-slate-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Add Collaborators</h2>
              <button onClick={() => setIsModalOpen(false)} className="hover:text-red-400 text-slate-400">
                <i className="ri-close-fill" />
              </button>
            </div>
            <div className="overflow-auto max-h-80 space-y-2">
              {users.map(u => (
                <div
                  key={u._id}
                  onClick={() => {
                    const upd = new Set(selectedUserId);
                    upd.has(u._id) ? upd.delete(u._id) : upd.add(u._id);
                    setSelectedUserId(upd);
                  }}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedUserId.has(u._id) 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                  }`}
                >
                  {u.email}
                </div>
              ))}
            </div>
            <button 
              onClick={addCollaborators} 
              className="mt-4 w-full py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-medium"
            >
              Add Selected
            </button>
          </div>
        </div>
      )}
    </main>
  );
};

export default ProjectUI;