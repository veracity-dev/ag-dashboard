pipeline {
    agent any

    options {
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '5'))
        timeout(time: 30, unit: 'MINUTES')
    }

    environment {
        PORT     = '3000'
        APP_URL  = 'http://15.206.22.207:3000'
        SERVE_CMD = "npx serve -s . -l ${PORT}"
        LOG_FILE = 'serve.log'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                echo "Building commit: ${env.GIT_COMMIT?.take(8)}"
            }
        }

        stage('Install dependencies') {
            steps {
                sh '''
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
                    pkill -f "serve -s . -l ${PORT}" || true
                    sleep 2
                '''
            }
        }

        stage('Deploy') {
            steps {
                sh '''
                    # BUILD_ID=dontKillMe stops Jenkins from reaping this background
                    # process when the step/build finishes — without it Jenkins kills
                    # every child process it spawned, taking the server down with it.
                    export BUILD_ID=dontKillMe
                    nohup ${SERVE_CMD} > ${LOG_FILE} 2>&1 < /dev/null &
                    disown
                '''
            }
        }

        stage('Health check') {
            steps {
                sh '''
                    echo "Waiting for server to boot..."
                    STATUS=1
                    for i in $(seq 1 20); do
                        sleep 3
                        if curl -sf "${APP_URL}" > /dev/null 2>&1; then
                            echo "App : OK"
                            STATUS=0
                            break
                        fi
                        echo "Not ready yet, retry $i/20..."
                    done
                    if [ "$STATUS" -ne 0 ]; then
                        echo "App : FAIL"
                    fi
                    exit $STATUS
                '''
            }
        }
    }

    post {
        always {
            sh 'ps aux | grep "[s]erve -s . -l ${PORT}" || echo "No serve process found"'
        }
        failure {
            sh "tail -n 80 ${LOG_FILE} || true"
        }
        success {
            echo "Deployed successfully — ${APP_URL}"
        }
    }
}
