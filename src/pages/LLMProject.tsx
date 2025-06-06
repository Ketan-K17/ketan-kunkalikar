import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const LLMProject = () => {
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
            Building a GPT-like LLM From Scratch
          </h1>
          <div className="aspect-video rounded-lg overflow-hidden mb-12">
            <img
              src="public/images/llm_architecture.png"
              alt="LLM Architecture"
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
            This project focuses on building a GPT-like Large Language Model from scratch, following Sebastian Raschka's comprehensive guide. The goal is to understand the fundamental architecture and mechanisms that power modern language models like GPT.
          </p>
          <p className="text-gray-300 leading-relaxed">
            Through this implementation, we explore key concepts such as attention mechanisms, transformer architecture, and the training process of large language models.
          </p>
        </section>

        {/* Key Components */}
        <section className="mb-16">
          <h2 className="text-2xl font-semibold mb-6 text-blue-400">Key Components</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4 text-white">Transformer Architecture</h3>
              <p className="text-gray-300">
                Implementation of the core transformer architecture, including self-attention mechanisms, feed-forward networks, and layer normalization.
              </p>
            </div>
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4 text-white">Training Pipeline</h3>
              <p className="text-gray-300">
                Custom training loop with gradient accumulation, learning rate scheduling, and efficient memory management techniques.
              </p>
            </div>
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4 text-white">Tokenization</h3>
              <p className="text-gray-300">
                Implementation of byte-pair encoding (BPE) tokenization, similar to what's used in production LLMs.
              </p>
            </div>
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4 text-white">Optimization</h3>
              <p className="text-gray-300">
                Advanced optimization techniques including mixed-precision training and gradient checkpointing.
              </p>
            </div>
          </div>
        </section>

        {/* Technical Details */}
        <section className="mb-16">
          <h2 className="text-2xl font-semibold mb-6 text-blue-400">Technical Details</h2>
          <div className="bg-gray-800 rounded-lg p-8">
            <ul className="list-disc list-inside space-y-4 text-gray-300">
              <li>Implementation of multi-head attention mechanism</li>
              <li>Position embeddings and layer normalization</li>
              <li>Causal masking for autoregressive generation</li>
              <li>Efficient implementation using PyTorch</li>
              <li>Custom dataset preprocessing pipeline</li>
              <li>Model evaluation and perplexity metrics</li>
            </ul>
          </div>
        </section>

        {/* Progress Updates */}
        <section>
          <h2 className="text-2xl font-semibold mb-6 text-blue-400">Current Progress</h2>
          <div className="space-y-6">
            <div className="border-l-4 border-blue-500 pl-6">
              <h3 className="text-xl font-semibold mb-2 text-white">Phase 1: Architecture Implementation</h3>
              <p className="text-gray-300">Completed implementation of core transformer components and basic training loop.</p>
            </div>
            <div className="border-l-4 border-green-500 pl-6">
              <h3 className="text-xl font-semibold mb-2 text-white">Phase 2: Training Pipeline</h3>
              <p className="text-gray-300">Currently working on optimization techniques and scaling strategies.</p>
            </div>
            <div className="border-l-4 border-gray-500 pl-6">
              <h3 className="text-xl font-semibold mb-2 text-white">Phase 3: Fine-tuning & Evaluation</h3>
              <p className="text-gray-300">Upcoming phase focusing on model evaluation and performance optimization.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default LLMProject; 