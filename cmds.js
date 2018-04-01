 
const Sequelize = require('sequelize');
const {models}= require('./model');
const {log,biglog, errorlog, colorize}=require("./out");



exports.helpCmd=(socket,rl)=>{
	
	log(socket,'Comandos:');
	log(socket,'h|help - Muestra esta ayuda.');
	log(socket,'list - Listar los quizzes existentes.');
	log(socket,'show <id> - Muestra la pregunta y la respuesta el quiz indicado:');
	log(socket,'add - AÃ±adir un nuevo quiz interactivamente.');
	log(socket,'delete <id> - Borrar el quiz indicado.');
	log(socket,'edit <id> - Editar el quiz indicado.');
	log(socket,'test <id> - Probar el quiz indicado.');
	log(socket,'p|play - Jugar a preguntar aleatoriamente todos los quizzes.');
	log(socket,'credits - CrÃ©ditos.');
	log(socket,'q|quit - Salir del programa.');
	rl.prompt();

};

exports.quitCmd=(socket,rl)=>{
	rl.close();
	socket.end();
};

const makeQuestion = (rl, text) => {
	return new Sequelize.Promise((resolve, reject) => {
		rl.question(colorize(text,'red'),answer => {
			resolve(answer.trim());
		});
	});
};



exports.addCmd = (socket,rl) => {

    makeQuestion(rl, 'Introduzca una pregunta: ')
        .then(q => {
            return makeQuestion(rl, 'Introduzca la respuesta: ')
                .then(a => {
                    return{question: q, answer: a };
                });
        })
        .then(quiz => {
            return models.quiz.create(quiz);
        })
        .then((quiz) => {
            log(socket,` ${colorize('Se ha aÃ±adido', 'magenta')}: ${quiz.question} ${colorize('=>','magenta')} ${quiz.answer}`);
        })
        .catch(Sequelize.ValidationError, error => {
            errorlog(socket,'El quiz es erroneo:');
            error.errors.forEach(({message}) => errorlog(socket,message));
        })
        .catch(error => {
            errorlog(socket,error.message);
        })
        .then(() => {
            rl.prompt();
        });
};

exports.listCmd=(socket,rl)=>{

	models.quiz.findAll()
	.each(quiz => {
		log(socket,`[${colorize(quiz.id,'magenta')}]: ${quiz.question}`);	
	})
	.catch(error => {
		errorlog(socket,error.message);
	})
	.then(() => {
		rl.prompt();
	});

};

const validateId = id => {
	return new Sequelize.Promise((resolve, reject)=>{
		if (typeof id === "undefined"){
			reject(new Error(`Falta el parametro <id>.`));
		} else {
			id = parseInt(id);
			if(Number.isNaN(id)) {
				reject (new Error(`El valor del parameter <id> no es un numero.`));
			}else{
				resolve(id);
			}
		}
	});
};


exports.showCmd=(socket,rl,id)=>{
	validateId(id)
	.then(id => models.quiz.findById(id))
	.then(quiz => {
		if (!quiz) {
			throw new Error(`No existe un quiz asociado al id=${id}.`);
		}
		log(socket,`[${colorize(quiz.id,'magenta')}]: ${quiz.question} ${colorize('=>','magenta')} ${quiz.answer}`);
	})
	.catch(error => {
		errorlog(socket,error.message);
	})
	.then(() => {
		rl.prompt();	
	});
};

exports.playCmd=(socket,rl)=>{
	
	let i=0;
	let score = 0;
	let toBeResolved = []
	models.quiz.findAll()
	.each(quiz => {
		toBeResolved[i]=quiz;	
		i=i+1;
	})

	.then(() => {
    		playOne();
  	});

	const playOne =()=>{
		if (toBeResolved.length===0){
			log(socket,'No hay nada mas que preguntar.');
			log(socket,'Fin del examen. Aciertos:');							
			log(socket,score,'magenta');
			rl.prompt();
		}
		else {
			let id = Math.floor(Math.random()*toBeResolved.length);
			const quiz = toBeResolved[id];
			toBeResolved.splice(id,1);			
			rl.question((`${colorize(quiz.question,'red')}${colorize('? ','red')}`),resp => {
				
				let q = quiz.answer.toLowerCase().trim();
				let r = resp.toLowerCase().trim();

				if (r===q){
					score=score+1;
					log(socket,"Su respuesta es correcta");
					log(socket,`CORRECTO - Lleva ${score} aciertos.`);
					playOne();
				}
				else{
					log(socket,"Su respuesta es incorrecta");
					log(socket,'INCORRECTO');
					log(socket,'Fin del examen. Aciertos:');
					//biglog(`${colorize(score,'magenta')}`);
					log(socket,`${colorize(score,'magenta')}`);
					rl.prompt();
				}
				rl.prompt();
			});			
	
		}
	}

	
};

exports.testCmd= (socket,rl,id) =>{
	validateId(id)
	.then(id => models.quiz.findById(id))
 	.then(quiz => {
    		if(!quiz) {
      			throw new Error(`No existe un quiz asociado al id = ${id}`);
    		}
    		return makeQuestion(rl,`${colorize(quiz.question,'red')}${colorize('? ','red')}`)
    		.then(a => {
      	       		let q = quiz.answer.toLowerCase().trim();
			let r = a.toLowerCase().trim();
			if (q==r){
        			biglog(socket,'CORRECTA','green');
			}else{
				biglog(socket,'INCORRECTA','red');
			}
		});
	})
	.catch(Sequelize.ValidationError, error => {
   		errorlog(socket,'El quiz es errÃ³neo: ');
    		error.errors.forEach(({message}) => errorlog(socket,message));
  	})
  	.catch(error => {
   	 	errorlog(socket,error.message);
  	})
  	.then(() => {
    		rl.prompt();
  	});				
};


exports.deleteCmd=(socket,rl,id)=>{
	validateId(id)
  	.then(id => models.quiz.destroy({where: {id}}))
  	.catch(error => {
    		errorlog(socket,error.message);
  	})
  	.then(() => {
    		rl.prompt();
	});
};

exports.editCmd = (socket,rl, id) => {
  	validateId(id)
  	.then(id => models.quiz.findById(id))
 	.then(quiz => {
    		if(!quiz) {
      			throw new Error(`No existe un quiz asociado al id = ${id}`);
    		}
    	
		process.stdout.isTTY && setTimeout(() => {rl.write(quiz.question)}, 0);
    		return makeQuestion(rl, 'Introduzca la pregunta: ')
    		.then(q => {
      			process.stdout.isTTY && setTimeout(() => {rl.write(quiz.answer)}, 0);
      			return makeQuestion(rl, 'Introduzca la respuesta: ')
      			.then(a => {
        			quiz.question = q;
        			quiz.answer = a;
        			return quiz;
      			});
    		});
  	})
  	.then(quiz => {
    	return quiz.save();
  	})
  	.then(quiz => {
    		log(socket,`Se ha cambiado el quiz ${colorize(quiz.id, 'magenta')} por: ${quiz.question} ${colorize(' => ', 'magenta')} ${quiz.answer}`);
  	})
  	.catch(Sequelize.ValidationError, error => {
   		errorlog(socket,'El quiz es errÃ³neo: ');
    		error.errors.forEach(({message}) => errorlog(socket,message));
  	})
  	.catch(error => {
   	 	errorlog(socket,error.message);
  	})
  	.then(() => {
    		rl.prompt();
  	});
};

exports.creditsCmd=(socket,rl)=>{
	log(socket,'Autores de las practicas:');
	log(socket,'Marta','green');
	rl.prompt();
};




