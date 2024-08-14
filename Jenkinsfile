def PROJECT_EXISTS = false
def FOLDER_EXISTS = 'n'
def DEPLOY_DOMAIN = 'lab.pre.rtve.es'
def DEPLOY_IP = "$env.IP_PRE"
def ENVIRONMENT = 'staging'

pipeline {
  agent any
  environment {
    PROJECT_NAME = '${PROJECT_NAME}'
    NAME_PROCESS_PM2 = '${PROJECT_NAME}'
    REPO_URL = 'git@git.lab.rtve.es:evoluciona/${PROJECT_NAME}.git'
  }
   stages {
       stage('Init') {
           steps {
               script{
					if(null == env.gitlabTargetBranch){
						env.gitlabTargetBranch = "${JOB_BASE_NAME}"
					}
					//env.gitlabTargetBranch = "develop"
					if(env.gitlabTargetBranch == "main" || env.gitlabTargetBranch == "master"){
						DEPLOY_DOMAIN = 'lab.rtve.es'
						DEPLOY_IP = "$env.IP_PRD1"
						ENVIRONMENT = 'production'
					}
					echo "branch: $env.gitlabTargetBranch"
					echo "deploy domain: $DEPLOY_DOMAIN"
					echo "deploy IP: $DEPLOY_IP"
					echo "environment: $ENVIRONMENT"
					
					PROJECT_EXISTS = sh(script: "ssh -o ConnectTimeout=10 jenkinsUser@${DEPLOY_IP} pm2 show ${PROJECT_NAME}", returnStatus: true) == 0
					echo "proyecto existe previamente: $PROJECT_EXISTS"
					FOLDER_EXISTS = sh(script: "ssh -o ConnectTimeout=10 jenkinsUser@$DEPLOY_IP '[ -d \"/data/$DEPLOY_DOMAIN/home/html/$PROJECT_NAME\" ] &&  echo y || echo n'", returnStdout: true).trim()
					echo "carpeta existe previamente: $FOLDER_EXISTS"
               }
           }
       }
       stage('Descargar fuentes') {
           steps {
               git branch: "${env.gitlabTargetBranch}",
               url: "${REPO_URL}"
               script{
					echo "descargando fuentes en $DEPLOY_IP"
					if(FOLDER_EXISTS == 'y'){
						echo "proyecto existe, hacer checkout branch $env.gitlabTargetBranch"
						sh "ssh -o ConnectTimeout=10 jenkinsUser@$DEPLOY_IP 'cd /data/$DEPLOY_DOMAIN/home/html/$PROJECT_NAME && \
						git pull; exit'"
					}else{
						echo "proyecto no existe, clone y compilar"
						sh "ssh -o ConnectTimeout=10 jenkinsUser@$DEPLOY_IP 'cd /data/$DEPLOY_DOMAIN/home/html/ && \
						git clone $REPO_URL $PROJECT_NAME && \
						cd $PROJECT_NAME && \
						git checkout --force $gitlabTargetBranch; exit'"
					}
               }
            }
        }
        stage('Compilar') {
            steps {
               script{
                    echo "compilando en $DEPLOY_IP"
                    
					if(PROJECT_EXISTS){
						sh "ssh -o ConnectTimeout=10 jenkinsUser@$DEPLOY_IP 'cd /data/$DEPLOY_DOMAIN/home/html/$PROJECT_NAME && \
						nvm use && \
						pm2 stop $NAME_PROCESS_PM2 && \
						npm i --silent && \
						npm run sass && \
						npm run build:$ENVIRONMENT; exit'" 
					}else{
						sh "ssh -o ConnectTimeout=10 jenkinsUser@$DEPLOY_IP 'cd /data/$DEPLOY_DOMAIN/home/html/$PROJECT_NAME && \
						nvm install && \
						npm i --silent && \
                        npm run sass && \
						npm run build:$ENVIRONMENT; exit'"
					}
               }
            }
        }
        stage('start process') {
            steps {
               script{
                   if(ENVIRONMENT == 'production'){
                        if(PROJECT_EXISTS){
                            echo "reiniciando $NAME_PROCESS_PM2 en prd1"
                            sh "ssh -o ConnectTimeout=10 jenkinsUser@$IP_PRD1 'pm2 start $NAME_PROCESS_PM2; exit'" 
                            echo "reiniciando $NAME_PROCESS_PM2 en prd2"
                            sh "ssh -o ConnectTimeout=10 jenkinsUser@$IP_PRD2 'pm2 start $NAME_PROCESS_PM2; exit'"
                        }else{
                            echo "iniciando $NAME_PROCESS_PM2 en prd1"
                            sh "ssh -o ConnectTimeout=10 jenkinsUser@$IP_PRD1 'cd /data/lab.rtve.es/home/html/$PROJECT_NAME && \
                            nvm install && \
                            pm2 start \"npm\" --name \"$NAME_PROCESS_PM2\" -- run $ENVIRONMENT && \
                            pm2 save'"
                            echo "iniciando $NAME_PROCESS_PM2 en prd2"
                            sh "ssh -o ConnectTimeout=10 jenkinsUser@$IP_PRD2 'cd /data/lab.rtve.es/home/html/$PROJECT_NAME && \
                            nvm install && \
                            pm2 start \"npm\" --name \"$NAME_PROCESS_PM2\" -- run $ENVIRONMENT && \
                            pm2 save'"
                        }
                   }else{
                        if(PROJECT_EXISTS){
                            echo "reiniciando $NAME_PROCESS_PM2 en pre"
                            sh "ssh -o ConnectTimeout=10 jenkinsUser@$IP_PRE 'pm2 restart $NAME_PROCESS_PM2; exit'" 
                        }else{
                            echo "iniciando $NAME_PROCESS_PM2 en pre"
                            sh "ssh -o ConnectTimeout=10 jenkinsUser@$IP_PRE 'cd /data/lab.pre.rtve.es/home/html/$PROJECT_NAME && \
                            nvm install && \
                            pm2 start \"npm\" --name \"$NAME_PROCESS_PM2\" -- run $ENVIRONMENT && \
                            pm2 save'"
                        }
                   }
               }
            }
        }
        stage("purgar cache"){
            steps{
                script{
                    def pathToPurge
                    if(ENVIRONMENT == 'staging'){
                        pathToPurge = "lab-pre.rtve.es/${PROJECT_NAME}"
                    }else{
                        pathToPurge = "lab.rtve.es/${PROJECT_NAME}"
                    }
                    commonsTools.purgueFastly(pathToPurge)
                }
            }
        }
   }
}