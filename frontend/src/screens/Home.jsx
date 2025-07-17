import React, { useContext, useEffect, useState } from 'react';
import { userContext } from '../context/user.context';
import axios from '../config/axios';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const { user } = useContext(userContext);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [project, setProject] = useState([]);
  const navigate = useNavigate()

  const createProject = (e) => {
    e.preventDefault();
    if (projectName.trim()) {
      axios.post('/projects/create', { name: projectName })
        .then((res) => {
          setProject((prev) => [...prev, res.data.project]);
          setIsModalOpen(false);
        })
        .catch((err) => console.log(err));
      setProjectName('');
    }
  };

  useEffect(() => {
    axios.get('/projects/all')
      .then((res) => setProject(res.data.projects))
      .catch((err) => console.log(err));
  }, []);

  return (
    <main className="p-6 min-h-screen bg-gray-900 text-white transition-all duration-300">
      <h1 className="text-2xl font-bold mb-8 text-center">Welcome, {user?.name || 'Developer'}!</h1>

      {/* New Project Button */}
      <div className="flex justify-start mb-6">
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex cursor-pointer items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-md"
        >
          <i className="ri-folder-add-line text-xl"></i>
          <span className="font-medium">Create New Project</span>
        </button>
      </div>

      {/* Project List */}
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
        {project.map((project) => (
          <div
            key={project._id}
            onClick={() => {navigate(`/project/${project._id}`)}}
            className="p-5 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 cursor-pointer transition-all duration-200 flex justify-between items-center"
          >
            <div>
              <p className="text-md font-semibold">{project.name}</p>
              <p className="text-sm text-gray-400">{project.users?.length || 0} contibutor{(project.users?.length !== 1) && 's'}</p>
            </div>
            <i className="ri-link text-gray-400 text-lg"></i>
          </div>
        ))}

      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-gray-800 p-6 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-4">Create New Project</h2>
            <form onSubmit={createProject}>
              <label className="block mb-2 text-sm font-medium text-gray-300">
                Project Name
              </label>
              <input
                type="text"
                className="w-full px-4 py-2 mb-4 bg-gray-700 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your project name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-300 border border-gray-500 rounded-md hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
};

export default Home;
