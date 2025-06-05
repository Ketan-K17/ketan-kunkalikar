
import { useState } from "react";
import { Menu, X, ExternalLink, Github, Linkedin, Mail, Book, GraduationCap, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const Index = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const publications = [
    {
      title: "Machine Learning with PyTorch and Scikit-Learn",
      year: "2022",
      journal: "Packt Publishing",
      type: "Book",
      description: "Develop machine learning and deep learning models with Python"
    },
    {
      title: "Python Machine Learning",
      year: "2019",
      journal: "Packt Publishing", 
      type: "Book",
      description: "Machine Learning and Deep Learning with Python, scikit-learn, and TensorFlow"
    },
    {
      title: "Model Evaluation, Model Selection, and Algorithm Selection in Machine Learning",
      year: "2018",
      journal: "arXiv preprint",
      type: "Paper",
      description: "Comprehensive guide to machine learning model evaluation techniques"
    },
    {
      title: "MLxtend: Providing machine learning and data science utilities",
      year: "2018",
      journal: "Journal of Open Source Software",
      type: "Paper",
      description: "A Python library of useful tools for the day-to-day data science tasks"
    }
  ];

  const books = [
    {
      title: "Machine Learning with PyTorch and Scikit-Learn",
      cover: "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=300&h=400&fit=crop",
      description: "Develop machine learning and deep learning models with Python",
      year: "2022"
    },
    {
      title: "Python Machine Learning",
      cover: "https://images.unsplash.com/photo-1532012197267-da84d127e765?w=300&h=400&fit=crop",
      description: "Machine Learning and Deep Learning with Python, scikit-learn, and TensorFlow",
      year: "2019"
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Sebastian Raschka</h1>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-8">
                <a href="#about" className="text-gray-700 hover:text-blue-600 transition-colors">About</a>
                <a href="#publications" className="text-gray-700 hover:text-blue-600 transition-colors">Publications</a>
                <a href="#books" className="text-gray-700 hover:text-blue-600 transition-colors">Books</a>
                <a href="#contact" className="text-gray-700 hover:text-blue-600 transition-colors">Contact</a>
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t">
              <a href="#about" className="block px-3 py-2 text-gray-700 hover:text-blue-600 transition-colors">About</a>
              <a href="#publications" className="block px-3 py-2 text-gray-700 hover:text-blue-600 transition-colors">Publications</a>
              <a href="#books" className="block px-3 py-2 text-gray-700 hover:text-blue-600 transition-colors">Books</a>
              <a href="#contact" className="block px-3 py-2 text-gray-700 hover:text-blue-600 transition-colors">Contact</a>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight">
                Sebastian Raschka
              </h1>
              <p className="text-xl text-gray-600 mb-4">
                Machine Learning Researcher & Author
              </p>
              <p className="text-lg text-gray-700 mb-8 leading-relaxed">
                Assistant Professor of Statistics at University of Wisconsin-Madison. 
                Author of bestselling machine learning books and open-source contributor 
                passionate about making AI education accessible.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Mail className="mr-2 h-4 w-4" />
                  Contact
                </Button>
                <Button variant="outline">
                  <Github className="mr-2 h-4 w-4" />
                  GitHub
                </Button>
                <Button variant="outline">
                  <Linkedin className="mr-2 h-4 w-4" />
                  LinkedIn
                </Button>
              </div>
            </div>
            <div className="flex justify-center lg:justify-end">
              <div className="relative">
                <img
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face"
                  alt="Sebastian Raschka"
                  className="w-80 h-80 rounded-full object-cover shadow-2xl"
                />
                <div className="absolute -bottom-4 -right-4 bg-blue-600 text-white p-3 rounded-full">
                  <GraduationCap className="h-6 w-6" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">About</h2>
            <div className="w-20 h-1 bg-blue-600 mx-auto"></div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="border-none shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-8 text-center">
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                  <GraduationCap className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Education</h3>
                <p className="text-gray-600">
                  Ph.D. in Computational Biology from Michigan State University. 
                  Specialized in machine learning applications in bioinformatics.
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-8 text-center">
                <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Book className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Research</h3>
                <p className="text-gray-600">
                  Focus on deep learning, computational statistics, and machine learning 
                  with applications in computer vision and natural language processing.
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-8 text-center">
                <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Award className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Teaching</h3>
                <p className="text-gray-600">
                  Assistant Professor at UW-Madison, teaching machine learning and statistics. 
                  Passionate about making complex concepts accessible.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Books Section */}
      <section id="books" className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Books</h2>
            <div className="w-20 h-1 bg-blue-600 mx-auto"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {books.map((book, index) => (
              <Card key={index} className="overflow-hidden border-none shadow-lg hover:shadow-xl transition-shadow">
                <div className="md:flex">
                  <div className="md:w-1/3">
                    <img
                      src={book.cover}
                      alt={book.title}
                      className="w-full h-64 md:h-full object-cover"
                    />
                  </div>
                  <CardContent className="md:w-2/3 p-8">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-medium text-blue-600 bg-blue-100 px-3 py-1 rounded-full">
                        {book.year}
                      </span>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">{book.title}</h3>
                    <p className="text-gray-600 mb-6">{book.description}</p>
                    <Button variant="outline" size="sm">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View Book
                    </Button>
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Publications Section */}
      <section id="publications" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Selected Publications</h2>
            <div className="w-20 h-1 bg-blue-600 mx-auto"></div>
          </div>
          
          <div className="space-y-6">
            {publications.map((pub, index) => (
              <Card key={index} className="border-l-4 border-l-blue-600 border-t-0 border-r-0 border-b-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded">
                          {pub.type}
                        </span>
                        <span className="text-sm text-gray-500">{pub.year}</span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{pub.title}</h3>
                      <p className="text-gray-600 mb-3">{pub.description}</p>
                      <p className="text-sm font-medium text-gray-700">{pub.journal}</p>
                    </div>
                    <Button variant="ghost" size="sm" className="mt-3 sm:mt-0 sm:ml-4">
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
      <section id="contact" className="py-20 bg-gray-900 text-white">
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
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Mail className="mr-2 h-4 w-4" />
                sebastianraschka@gmail.com
              </Button>
              
              <div className="flex gap-4">
                <Button variant="outline" size="icon" className="text-white border-gray-600 hover:bg-gray-800">
                  <Github className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="text-white border-gray-600 hover:bg-gray-800">
                  <Linkedin className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-950 text-gray-400 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p>&copy; 2024 Sebastian Raschka. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
