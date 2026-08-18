pipeline {
    agent any

    options {
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '5'))
        timeout(time: 30, unit: 'MINUTES')
    }

    environment {
        PORT        = '3000'
        APP_URL     = 'http://localhost:3000'
        LOG_FILE    = 'serve.log'
        PID_FILE    = 'serve.pid'
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm

                script {
                    echo "Building commit: ${env.GIT_COMMIT?.take(8)}"
                }
            }
        }

        stage('Install dependencies') {
            steps {
                sh '''
                    echo "Node version:"
                    node -v

                    echo "NPM version:"
                    npm -v

                    if [ -f package-lock.json ]; then
                        npm ci --omit=dev
                    else
                        npm install --omit=dev
                    fi
                '''
            }
        }

        stage('Stop previous instance') {
            steps {
                sh '''
                    echo "Stopping previous application instance..."

                    if [ -f "${PID_FILE}" ]; then
                        OLD_PID=$(cat "${PID_FILE}")

                        if kill -0 "$OLD_PID" 2>/dev/null; then
                            echo "Stopping PID: $OLD_PID"
                            kill "$OLD_PID" || true
                            sleep 2
                        fi

                        rm -f "${PID_FILE}"
                    fi

                    # Fallback in case PID file does not exist
                    pkill -f "serve -s . -l ${PORT}" || true

                    sleep 2

                    echo "Previous instance stopped."
                '''
            }
        }

        stage('Deploy') {
            steps {
                sh '''
                    echo "Starting application on port ${PORT}..."

                    # Prevent Jenkins Pipeline from killing the background process
                    export JENKINS_NODE_COOKIE=dontKillMe

                    nohup npx serve -s . -l ${PORT} \
                        > "${LOG_FILE}" 2>&1 < /dev/null &

                    APP_PID=$!

                    echo "$APP_PID" > "${PID_FILE}"

                    echo "Application started with PID: $APP_PID"

                    sleep 3
                '''
            }
        }

        stage('Health check') {
            steps {
                sh '''
                    echo "Waiting for application to become available..."

                    STATUS=1

                    for i in $(seq 1 20); do

                        if curl -sf "${APP_URL}" > /dev/null 2>&1; then
                            echo "--------------------------------"
                            echo "Application is running successfully."
                            echo "URL: ${APP_URL}"
                            echo "--------------------------------"

                            STATUS=0
                            break
                        fi

                        echo "Application not ready. Attempt $i/20"

                        sleep 3
                    done

                    if [ "$STATUS" -ne 0 ]; then
                        echo "--------------------------------"
                        echo "Application health check FAILED"
                        echo "--------------------------------"

                        echo "Server log:"
                        tail -n 100 "${LOG_FILE}" || true

                        exit 1
                    fi
                '''
            }
        }

        stage('Deployment info') {
            steps {
                sh '''
                    echo "Running process:"
                    ps aux | grep "[s]erve -s . -l ${PORT}" || true

                    echo ""
                    echo "Listening port:"
                    ss -ltnp | grep ":${PORT}" || true

                    echo ""
                    echo "PID:"
                    cat "${PID_FILE}" || true
                '''
            }
        }
    }

    post {

        success {
            echo "========================================="
            echo "Deployment successful"
            echo "Application: http://15.206.22.207:3000"
            echo "========================================="
        }

        failure {
            echo "Deployment failed."

            sh '''
                echo "Last 100 lines of application log:"
                tail -n 100 "${LOG_FILE}" || true
            '''
        }

        always {
            sh '''
                echo "Application process status:"

                ps aux | grep "[s]erve -s . -l ${PORT}" \
                    || echo "No serve process found"
            '''
        }
    }
}
