import { ArrowLeft, CheckCircle, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const PythonProject = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation Bar */}
      <nav className="bg-black border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Button
              variant="ghost"
              onClick={() => navigate("/#projects")}
              className="text-gray-300 hover:text-blue-400"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative py-16 bg-gradient-to-br from-black to-gray-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
            Learning Production-Ready Python
          </h1>
          <div className="aspect-video rounded-lg overflow-hidden mb-12">
            <img
              src="public/images/python_learning.png"
              alt="Python Learning Journey"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>

      {/* Content Sections */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Project Overview */}
        <section className="mb-16">
          <h2 className="text-2xl font-semibold mb-6 text-blue-400">Project Overview</h2>
          <p className="text-gray-300 leading-relaxed mb-6">
            This project documents my journey through Brett Slatkin's "Effective Python" book, focusing on writing clean, efficient, and production-ready Python code. The goal is to master Python's idioms and best practices to write more maintainable and performant code.
          </p>
          <p className="text-gray-300 leading-relaxed">
            Each chapter contains practical examples and exercises that demonstrate important Python concepts and best practices. The progress is tracked through implementation of these concepts in real-world scenarios.
          </p>
        </section>

        
        

        {/* Key Learnings */}
        <section className="mb-16">
          <h2 className="text-2xl font-semibold mb-6 text-blue-400">Key Learnings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4 text-white">Code Organization</h3>
              <p className="text-gray-300">
                Understanding Python's module system, package structure, and best practices for organizing large codebases.
              </p>
            </div>
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4 text-white">Performance Optimization</h3>
              <p className="text-gray-300">
                Techniques for writing efficient Python code, including proper use of generators, iterators, and decorators.
              </p>
            </div>
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4 text-white">Testing Strategies</h3>
              <p className="text-gray-300">
                Implementing comprehensive test suites using pytest and understanding test-driven development principles.
              </p>
            </div>
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4 text-white">Error Handling</h3>
              <p className="text-gray-300">
                Best practices for exception handling, debugging, and writing robust error recovery code.
              </p>
            </div>
          </div>
        </section>

        {/* Future Goals */}
        <section>
          <h2 className="text-2xl font-semibold mb-6 text-blue-400">Future Goals</h2>
          <div className="bg-gray-800 rounded-lg p-8">
            <ul className="list-disc list-inside space-y-4 text-gray-300">
              <li>Complete all 90 items from "Effective Python"</li>
              <li>Build a comprehensive project implementing learned concepts</li>
              <li>Create a series of blog posts documenting key learnings</li>
              <li>Contribute to open-source Python projects</li>
              <li>Develop custom tools using advanced Python features</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
};

export default PythonProject; 