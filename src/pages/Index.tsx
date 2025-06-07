import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, X, ExternalLink, Github, Linkedin, Mail, Book, GraduationCap, Award, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import ContactModal from "@/components/ContactModal";

// Enhanced floating particle component with more dynamic movement
const FloatingParticle = ({ delay = 0, duration = 20, size = 4 }: { delay?: number; duration?: number; size?: number }) => {
  const [position, setPosition] = useState({ x: Math.random() * 100, y: Math.random() * 100 });
  const [direction, setDirection] = useState({ x: Math.random() > 0.5 ? 1 : -1, y: Math.random() > 0.5 ? 1 : -1 });
  
  useEffect(() => {
    const interval = setInterval(() => {
      setPosition(prev => ({
        x: Math.max(0, Math.min(100, prev.x + (Math.random() - 0.5) * 20 * direction.x)),
        y: Math.max(0, Math.min(100, prev.y + (Math.random() - 0.5) * 20 * direction.y))
      }));
      
      // Occasionally change direction
      if (Math.random() < 0.1) {
        setDirection({
          x: Math.random() > 0.5 ? 1 : -1,
          y: Math.random() > 0.5 ? 1 : -1
        });
      }
    }, duration * 100);
    
    return () => clearInterval(interval);
  }, [duration, direction]);

  return (
    <div
             className="absolute rounded-full bg-gradient-to-r from-blue-400/40 to-purple-400/40 animate-pulse"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        left: `${position.x}%`,
        top: `${position.y}%`,
        animationDelay: `${delay}s`,
        transition: `all ${duration * 0.1}s cubic-bezier(0.4, 0, 0.2, 1)`,
        filter: 'blur(1px)',
                 boxShadow: `0 0 ${size * 2}px rgba(59, 130, 246, 0.5)`,
      }}
    />
  );
};

// Floating geometric shapes
const FloatingShape = ({ delay = 0, shape = 'circle' }: { delay?: number; shape?: 'circle' | 'triangle' | 'square' }) => {
  const [position, setPosition] = useState({ 
    x: Math.random() * 90, 
    y: Math.random() * 90,
    rotation: 0 
  });
  
  useEffect(() => {
    const interval = setInterval(() => {
      setPosition(prev => ({
        x: Math.max(5, Math.min(95, prev.x + (Math.random() - 0.5) * 10)),
        y: Math.max(5, Math.min(95, prev.y + (Math.random() - 0.5) * 10)),
        rotation: (prev.rotation + 2) % 360
      }));
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);

  const getShapeClasses = () => {
    switch (shape) {
      case 'triangle':
        return 'w-0 h-0 border-l-4 border-r-4 border-b-8 border-l-transparent border-r-transparent border-b-blue-400/20';
      case 'square':
        return 'w-3 h-3 bg-purple-400/20';
      default:
        return 'w-4 h-4 bg-blue-400/20 rounded-full';
    }
  };

  return (
    <div
      className={`absolute ${getShapeClasses()} animate-pulse`}
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        animationDelay: `${delay}s`,
        transition: 'all 3s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: `rotate(${position.rotation}deg)`,
      }}
    />
  );
};

// Enhanced animated background component
const AnimatedBackground = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
         <div className="absolute inset-0 overflow-hidden" style={{ minHeight: '200vh' }}>
       {/* Interactive gradient orbs that follow mouse */}
      <div 
        className="absolute w-96 h-96 bg-gradient-to-r from-blue-600/30 to-purple-600/30 rounded-full blur-3xl animate-pulse"
        style={{
          left: `${mousePosition.x * 0.1}%`,
          top: `${mousePosition.y * 0.1}%`,
          transition: 'all 2s ease-out',
        }}
      />
      <div 
        className="absolute w-80 h-80 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-full blur-3xl animate-pulse"
        style={{
          right: `${(100 - mousePosition.x) * 0.1}%`,
          bottom: `${(100 - mousePosition.y) * 0.1}%`,
          animationDelay: '2s',
          transition: 'all 2s ease-out',
        }}
      />
      
      {/* Moving gradient waves */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-blue-500/30 to-transparent animate-pulse transform -skew-y-1" 
             style={{ animation: 'slide-in-right 8s ease-in-out infinite alternate' }} />
        <div className="absolute bottom-0 right-0 w-full h-2 bg-gradient-to-r from-transparent via-purple-500/30 to-transparent animate-pulse transform skew-y-1" 
             style={{ animation: 'slide-in-right 10s ease-in-out infinite alternate-reverse' }} />
      </div>
      
      {/* Enhanced floating particles with more variety */}
      {Array.from({ length: 30 }).map((_, i) => (
        <FloatingParticle
          key={i}
          delay={i * 0.3}
          duration={10 + Math.random() * 15}
          size={1 + Math.random() * 8}
        />
      ))}
      
      {/* Floating geometric shapes */}
      {Array.from({ length: 8 }).map((_, i) => (
        <FloatingShape
          key={`shape-${i}`}
          delay={i * 0.8}
          shape={['circle', 'triangle', 'square'][i % 3] as 'circle' | 'triangle' | 'square'}
        />
      ))}
      
      {/* Animated grid pattern with movement */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.05)_1px,transparent_1px)] bg-[size:50px_50px] animate-pulse" 
           style={{ animation: 'fade-in 3s ease-in-out infinite alternate' }} />
      
      {/* Floating light beams */}
      <div className="absolute top-1/4 left-1/2 w-1 h-32 bg-gradient-to-b from-blue-400/40 to-transparent rotate-12 animate-pulse blur-sm" 
           style={{ animation: 'scale-in 4s ease-in-out infinite alternate' }} />
      <div className="absolute bottom-1/3 right-1/3 w-1 h-24 bg-gradient-to-t from-purple-400/40 to-transparent -rotate-12 animate-pulse blur-sm" 
           style={{ animation: 'scale-in 5s ease-in-out infinite alternate-reverse' }} />
    </div>
  );
};

// ... keep existing code (Index component with all sections)
const Index = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  const handleNavigation = (path: string) => {
    console.log('Navigating to:', path);
    navigate(path);
  };

  const completeProjects = [
    {
      title: "Machine Learning with PyTorch and Scikit-Learn",
      year: "2022",
      description: "Develop machine learning and deep learning models with Python"
    },
    {
      title: "Python Machine Learning",
      year: "2019",
      description: "Machine Learning and Deep Learning with Python, scikit-learn, and TensorFlow"
    },
    {
      title: "Model Evaluation, Model Selection, and Algorithm Selection in Machine Learning",
      year: "2018",
      description: "Comprehensive guide to machine learning model evaluation techniques"
    },
    {
      title: "MLxtend: Providing machine learning and data science utilities",
      year: "2018",
      description: "A Python library of useful tools for the day-to-day data science tasks"
    }
  ];

  const currentEndeavours = [
    {
      title: "Learning LLM architecture (Building a GPT-like LLM from scratch)",
      image: "/images/llm_from_scratch.png",
      description: "Building a GPT-like LLM from the ground-up while studying Sebastian Raschka's 'Build a Large Language Model (From Scratch)'",
      status: "In Progress",
      link: "https://github.com/Ketan-K17/building_llms_from_scratch",
      path: "/llm-project"
    },
    {
      title: "Learning to write impeccable, production-ready Python Code",
      image: "/images/effective_python.png",
      description: "Currently following Brett Slatkin's take on efficient Python Coding in his book 'Effective Python'",
      status: "In Progress",
      path: "/python-project"
    }
  ];

  return (
         <div className="min-h-screen bg-black">
      {/* Navigation */}
      <nav className="bg-black border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-white">Ketan Kunkalikar</h1>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-8">
                <a href="#about" className="text-gray-300 hover:text-blue-400 transition-colors">About</a>
                <a href="#complete-projects" className="text-gray-300 hover:text-blue-400 transition-colors">Complete Projects</a>
                <a href="#current-endeavours" className="text-gray-300 hover:text-blue-400 transition-colors">Current Endeavours</a>
                <a href="#contact" className="text-gray-300 hover:text-blue-400 transition-colors">Contact</a>
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-white hover:bg-gray-800"
              >
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-black border-t border-gray-700">
              <a href="#about" className="block px-3 py-2 text-gray-300 hover:text-blue-400 transition-colors">About</a>
              <a href="#complete-projects" className="block px-3 py-2 text-gray-300 hover:text-blue-400 transition-colors">Complete Projects</a>
              <a href="#current-endeavours" className="block px-3 py-2 text-gray-300 hover:text-blue-400 transition-colors">Current Endeavours</a>
              <a href="#contact" className="block px-3 py-2 text-gray-300 hover:text-blue-400 transition-colors">Contact</a>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section with Enhanced Animated Background */}
        <section className="relative py-20 bg-gradient-to-br from-black to-gray-900">
         <div className="absolute inset-0 h-[200%] overflow-hidden">
           <AnimatedBackground />
         </div>
        
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-in">
              <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight animate-scale-in">
                Ketan Kunkalikar
              </h1>
              <p className="text-xl text-gray-300 mb-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                AI Engineer and Agent Developer
              </p>
              <p className="text-lg text-gray-400 mb-8 leading-relaxed animate-fade-in" style={{ animationDelay: '0.4s' }}>
                SWE Intern @<i><b>Turtlemint</b></i><br/>
                Ex Agent Developer @<i><b>Spaider-Space</b></i><br/>
                Open-Source Contributor fascinated with AI, Large Language Models, and Agentic Systems.
              </p>
              <div className="flex flex-wrap gap-4 animate-fade-in" style={{ animationDelay: '0.6s' }}>
                <Button 
                  className="bg-blue-600 hover:bg-blue-700 text-white transform hover:scale-105 transition-all duration-200"
                  onClick={() => setIsContactModalOpen(true)}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Contact
                </Button>
                <a href="https://github.com/Ketan-K17" target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="border-gray-600 text-gray-900 hover:bg-gray-800 hover:text-white transform hover:scale-105 transition-all duration-200">
                    <Github className="mr-2 h-4 w-4" />
                    GitHub
                  </Button>
                </a>
                <a href="https://www.linkedin.com/in/ketan-kunkalikar-9393b6225/" target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="border-gray-900 text-gray-900 hover:bg-gray-800 hover:text-white transform hover:scale-105 transition-all duration-200">
                    <Linkedin className="mr-2 h-4 w-4" />
                    LinkedIn
                  </Button>
                </a>
                <a href="https://drive.google.com/file/d/1H-g5OoBjTWiaeivCW0Wqn_P51cz98wuJ/view?usp=sharing" target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="border-gray-900 text-gray-900 hover:bg-gray-800 hover:text-white transform hover:scale-105 transition-all duration-200">
                    <FileText className="mr-2 h-4 w-4" />
                    Resume
                  </Button>
                </a>
              </div>
            </div>
            <div className="flex justify-center lg:justify-end animate-fade-in" style={{ animationDelay: '0.8s' }}>
              <div className="relative">
                <img
                  src="/images/profile.png"
                  alt="Ketan Kunkalikar"
                  className="w-80 h-100 rounded-full object-cover shadow-2xl hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute -bottom-4 -right-4 bg-blue-600 text-white p-3 rounded-full animate-pulse">
                  <GraduationCap className="h-6 w-6" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Gradient transition */}
      <div className="h-96 bg-gradient-to-b from-transparent via-transparent to-black transform -translate-y-96 relative z-0"></div>

      {/* About Section */}
      <section id="about" className="py-20 bg-black -mt-96">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">About</h2>
            <div className="w-20 h-1 bg-blue-600 mx-auto"></div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Education Card */}
            <Card className="relative group border-gray-600 bg-gradient-to-br from-gray-700 to-gray-800 shadow-lg hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-500 overflow-hidden">
              {/* Animated background gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              {/* Floating particles in card */}
              <div className="absolute top-2 right-2 w-2 h-2 bg-blue-400/30 rounded-full animate-pulse"></div>
              <div className="absolute bottom-4 left-4 w-1 h-1 bg-purple-400/40 rounded-full animate-ping" style={{ animationDelay: '1s' }}></div>
              
              <CardContent className="relative p-8 text-center">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                  <GraduationCap className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-4 text-white group-hover:text-blue-300 transition-colors duration-300">Education</h3>
                <p className="text-gray-300 group-hover:text-gray-200 transition-colors duration-300">
                  Btech in Computer Science and Engineering from <b><i>National Institute of Technology, Goa</i></b>
                </p>
              </CardContent>
              {/* Animated border */}
              <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>
            </Card>

            {/* Research Card */}
            <Card className="relative group border-gray-600 bg-gradient-to-br from-gray-700 to-gray-800 shadow-lg hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-500 overflow-hidden" style={{ animationDelay: '0.2s' }}>
              {/* Animated background gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-transparent to-green-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              {/* Floating particles in card */}
              <div className="absolute top-4 left-6 w-1.5 h-1.5 bg-green-400/40 rounded-full animate-bounce"></div>
              <div className="absolute bottom-6 right-6 w-2 h-2 bg-blue-400/30 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
              
              <CardContent className="relative p-8 text-center">
                <div className="bg-gradient-to-br from-green-500 to-green-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                  <Book className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-4 text-white group-hover:text-green-300 transition-colors duration-300">Research</h3>
                <p className="text-gray-300 group-hover:text-gray-200 transition-colors duration-300">
                  Focus on Large Language Models, Model Finetuning on consumer devices, and Agentic Systems, with applications in Natural Language Processing and Automation.
                </p>
                
                {/* Animated border */}
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-blue-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>
              </CardContent>
            </Card>

            {/* Teaching Card */}
            <Card className="relative group border-gray-600 bg-gradient-to-br from-gray-700 to-gray-800 shadow-lg hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-500 overflow-hidden" style={{ animationDelay: '0.4s' }}>
              {/* Animated background gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-purple-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              {/* Floating particles in card */}
              <div className="absolute top-6 right-4 w-1 h-1 bg-purple-400/50 rounded-full animate-ping"></div>
              <div className="absolute bottom-2 left-2 w-1.5 h-1.5 bg-pink-400/30 rounded-full animate-bounce" style={{ animationDelay: '0.8s' }}></div>
              
              <CardContent className="relative p-8 text-center">
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                  <Award className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-4 text-white group-hover:text-purple-300 transition-colors duration-300">Occupations</h3>
                <p className="text-gray-300 group-hover:text-gray-200 transition-colors duration-300">
                  SWE Intern @<i><b>Turtlemint</b></i>, Ex-Agent Developer @<i><b>Spaider-Space</b></i>, Ex-Research Intern @<i><b>Distilled DDD</b></i>
                </p>
              </CardContent>
              {/* Animated border */}
              <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>
            </Card>
          </div>
        </div>
      </section>

      {/* Projects Section */}
      <section id="current-endeavours" className="py-20 bg-black">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">Current Endeavours</h2>
            <div className="w-20 h-1 bg-blue-600 mx-auto"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {currentEndeavours.map((endeavour, index) => (
              <Card key={index} className="overflow-hidden border-gray-600 bg-gray-800 shadow-lg hover:shadow-xl transition-shadow h-full">
                <div className="flex flex-col md:flex-row h-full">
                  <div className="md:w-1/3 h-64 md:h-auto relative">
                    <img
                      src={endeavour.image}
                      alt={endeavour.title}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  </div>
                  <CardContent className="md:w-2/3 p-8 flex flex-col h-full">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-medium text-blue-400 bg-blue-900 px-3 py-1 rounded-full">
                        {endeavour.status}
                      </span>
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-4">{endeavour.title}</h3>
                    <p className="text-gray-300 flex-grow">{endeavour.description}</p>
                    <div className="mt-6 flex gap-4">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="border-gray-600 text-gray-900 hover:bg-gray-700 hover:text-white transform hover:scale-105 transition-all duration-200"
                        onClick={() => handleNavigation(endeavour.path)}
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Read More
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-gray-600 text-gray-900 hover:bg-gray-700 hover:text-white transform hover:scale-105 transition-all duration-200"
                        onClick={endeavour.title.includes("Learning LLM architecture") ? 
                          () => window.open('https://github.com/Ketan-K17/building_llms_from_scratch', '_blank') : 
                          undefined}
                      >
                        <Book className="mr-2 h-4 w-4" />
                        View Progress
                      </Button>
                    </div>
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Publications Section */}
      <section id="complete-projects" className="py-20 bg-black">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">Complete Projects</h2>
            <div className="w-20 h-1 bg-blue-600 mx-auto"></div>
          </div>
          
          <div className="space-y-6">
            {completeProjects.map((project, index) => (
              <Card key={index} className="border-l-4 border-l-blue-600 border-t-0 border-r-0 border-b-0 bg-gray-700 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm text-gray-400">{project.year}</span>
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-2">{project.title}</h3>
                      <p className="text-gray-300">{project.description}</p>
                    </div>
                    <Button variant="ghost" size="sm" className="mt-3 sm:mt-0 sm:ml-4 text-gray-200 hover:bg-gray-600 hover:text-white">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 bg-gray-950 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Get In Touch</h2>
            <div className="w-20 h-1 bg-blue-500 mx-auto"></div>
          </div>
          
          <div className="text-center">
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Interested in collaboration or have questions about machine learning? 
              Feel free to reach out.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <Button 
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => setIsContactModalOpen(true)}
              >
                <Mail className="mr-2 h-4 w-4" />
                ketankunkalikar33@gmail.com
              </Button>
              
              <div className="flex gap-4">
                <a href="https://github.com/Ketan-K17" target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="icon" className="text-gray-900 border-gray-600 hover:bg-gray-800">
                    <Github className="h-4 w-4" />
                  </Button>
                </a>
                <a href="https://www.linkedin.com/in/ketan-kunkalikar-9393b6225/" target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="icon" className="text-gray-900 border-gray-600 hover:bg-gray-800">
                    <Linkedin className="h-4 w-4" />
                  </Button>
                </a>
                <a href="https://drive.google.com/file/d/1H-g5OoBjTWiaeivCW0Wqn_P51cz98wuJ/view?usp=sharing" target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="icon" className="text-gray-900 border-gray-600 hover:bg-gray-800">
                    <FileText className="h-4 w-4" />
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-gray-400 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p>&copy; 2025 Ketan Kunkalikar. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Contact Modal */}
      <ContactModal 
        isOpen={isContactModalOpen} 
        onClose={() => setIsContactModalOpen(false)} 
      />
    </div>
  );
};

export default Index;
