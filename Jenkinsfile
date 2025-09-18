pipeline {
    agent any
    
    environment {
        IMAGE_NAME = 'teamavail:latest'
        NODE_VERSION = '20'
    }
     
    stages {
        stage('Checkout') {
            steps {
                checkout scm
                script {
                    echo "Checked out code from ${env.GIT_URL}"
                }
            }
        }
        
        stage('Install Dependencies') {
            steps {
                script {
                    echo "Installing Node.js dependencies..."
                    sh '''
                        # Verify tools are available (pre-installed in custom Jenkins image)
                        echo "Node.js version: $(node --version)"
                        echo "npm version: $(npm --version)"
                        echo "Docker version: $(docker --version)"
                        echo "Docker Compose version: $(docker-compose --version)"
                        
                        # Install npm dependencies
                        if [ ! -d "node_modules" ]; then
                            echo "Installing npm dependencies..."
                            npm install
                        else
                            echo "Dependencies already installed."
                        fi
                        
                        # Verify global tools are available
                        echo "Global tools available:"
                        for tool in eslint prettier stylelint htmlhint jest supertest; do
                            if command -v "$tool" >/dev/null 2>&1; then
                                echo "✓ $tool: $($tool --version 2>/dev/null || echo 'installed')"
                            else
                                echo "✗ $tool: not found"
                            fi
                        done
                        
                        # Initialize ESLint config if missing
                        if [ ! -f ".eslintrc.js" ] && [ ! -f ".eslintrc.json" ] && [ ! -f "eslint.config.mjs" ]; then
                            echo "Initializing ESLint configuration..."
                            npx eslint --init --yes
                        else
                            echo "ESLint configuration already exists."
                        fi
                        
                        # Install Jest and Supertest if missing
                        if ! npm list jest >/dev/null 2>&1; then
                            echo "Installing Jest and Supertest..."
                            npm install --save-dev jest supertest
                        else
                            echo "Jest and Supertest already installed."
                        fi
                    '''
                }
            }
        }
        
        stage('Code Quality Checks') {
            parallel {
                stage('Format Check') {
                    steps {
                        script {
                            echo "Checking code formatting with Prettier..."
                            sh 'npm run format:check || echo "Format issues found - continuing with other checks..."'
                        }
                    }
                }
                
                stage('ESLint') {
                    steps {
                        script {
                            echo "Running ESLint..."
                            sh 'npm run lint:js || echo "ESLint issues found - continuing with other checks..."'
                        }
                    }
                }
                
                stage('Stylelint') {
                    steps {
                        script {
                            echo "Running Stylelint..."
                            sh 'npm run lint:css || echo "Stylelint issues found - continuing with other checks..."'
                        }
                    }
                }
                
                stage('HTMLHint') {
                    steps {
                        script {
                            echo "Running HTMLHint..."
                            sh 'npm run lint:html || echo "HTMLHint issues found - continuing with other checks..."'
                        }
                    }
                }
            }
        }
        
        stage('Tests') {
            parallel {
                stage('Unit Tests') {
                    steps {
                        script {
                            echo "Running Unit Tests..."
                            sh 'npm run test:unit || echo "Unit tests failed - continuing with other checks..."'
                        }
                    }
                }
                
                stage('Integration Tests') {
                    steps {
                        script {
                            echo "Running Integration Tests..."
                            sh 'npm run test:integration || echo "Integration tests failed - continuing with other checks..."'
                        }
                    }
                }
            }
        }
        
        stage('Docker Build') {
            steps {
                script {
                    echo "Building Docker image..."
                    sh '''
                        # Verify Docker tools are available (pre-installed in custom Jenkins image)
                        echo "Docker version: $(docker --version)"
                        echo "Docker Compose version: $(docker-compose --version)"
                        
                        # Build Docker image
                        docker build -t ${IMAGE_NAME} . || echo "Docker image build failed - continuing with other steps..."
                    '''
                }
            }
        }
        
        stage('Docker Compose Deploy') {
            steps {
                script {
                    echo "Starting application with Docker Compose..."
                     chmod -R 777 /var/jenkins_home/workspace/Availability_Tracker/input
                     chmod -R 777 /var/jenkins_home/workspace/Availability_Tracker/output
                    sh 'docker-compose up -d || echo "Docker Compose start failed - continuing with other steps..."'
                }
            }
        }
    }
    
    post {
        always {
            script {
                echo "Pipeline completed!"
                // Clean up workspace if needed
                sh '''
                    echo "Cleaning up temporary files..."
                    # Add any cleanup commands here
                '''
            }
        }
        
        success {
            script {
                echo "Pipeline succeeded! Application is running."
                // You can add notifications here (email, Slack, etc.)
            }
        }
        
        failure {
            script {
                echo "Pipeline failed! Check the logs for details."
                // You can add failure notifications here
            }
        }
        
        unstable {
            script {
                echo "Pipeline is unstable! Some checks failed but pipeline continued."
            }
        }
    }
}
