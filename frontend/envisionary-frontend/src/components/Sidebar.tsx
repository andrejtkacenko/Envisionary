import React, { useState } from "react";
import { Link } from "react-router-dom";

const Sidebar: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const toggleSidebar = () => setIsOpen(!isOpen);

  return (
    <>
      <button
        className="md:hidden fixed top-16 left-4 z-20 bg-gray-800 text-white p-2 rounded"
        onClick={toggleSidebar}
      >
        {isOpen ? "Close" : "Menu"}
      </button>
      <aside
        className={`bg-gray-900 text-white w-64 h-[calc(100vh-4rem)] fixed top-16 left-0 transform ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 transition-transform duration-300 ease-in-out z-10`}
      >
        <div className="p-4">
          <h2 className="text-lg font-semibold mb-4">Menu</h2>
          <nav className="space-y-2">
            <Link
              to="/dashboard"
              className="block p-2 hover:bg-gray-700 rounded"
              onClick={() => setIsOpen(false)}
            >
              Dashboard
            </Link>
            <Link
              to="/notes"
              className="block p-2 hover:bg-gray-700 rounded"
              onClick={() => setIsOpen(false)}
            >
              Notes
            </Link>
            <Link
              to="/projects"
              className="block p-2 hover:bg-gray-700 rounded"
              onClick={() => setIsOpen(false)}
            >
              Projects
            </Link>
          </nav>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;