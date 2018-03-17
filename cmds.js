 
const Sequelize = require('sequelize');
const {models}= require('./model');
const {log,biglog, errorlog, colorize}=require("./out");



exports.helpCmd=rl=>{
	
	log('Comandos:');
	log('h|help - Muestra esta ayuda.');
	log('list - Listar los quizzes existentes.');
	log('show <id> - Muestra la pregunta y la respuesta el quiz indicado:');
	log('add - Añadir un nuevo quiz interactivamente.');
	log('delete <id> - Borrar el quiz indicado.');
	log('edit <id> - Editar el quiz indicado.');
	log('test <id> - Probar el quiz indicado.');
	log('p|play - Jugar a preguntar aleatoriamente todos los quizzes.');
	log('credits - Créditos.');
	log('q|quit - Salir del programa.');
	rl.prompt();

};

exports.quitCmd=rl=>{
	rl.close();
};

const makeQuestion = (rl, text) => {
	return new Sequelize.Promise((resolve, reject) => {
		rl.question(colorize(text,'red'),answer => {
			resolve(answer.trim());
		});
	});
};



exports.addCmd = rl => {

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
            log(` ${colorize('Se ha añadido', 'magenta')}: ${quiz.question} ${colorize('=>','magenta')} ${quiz.answer}`);
        })
        .catch(Sequelize.ValidationError, error => {
            errorlog('El quiz es erroneo:');
            error.errors.forEach(({message}) => errorlog(message));
        })
        .catch(error => {
            errorlog(error.message);
        })
        .then(() => {
            rl.prompt();
        });
};

exports.listCmd=rl=>{

	models.quiz.findAll()
	.each(quiz => {
		log(`[${colorize(quiz.id,'magenta')}]: ${quiz.question}`);	
	})
	.catch(error => {
		errorlog(error.message);
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


exports.showCmd=(rl,id)=>{
	validateId(id)
	.then(id => models.quiz.findById(id))
	.then(quiz => {
		if (!quiz) {
			throw new Error(`No existe un quiz asociado al id=${id}.`);
		}
		log(`[${colorize(quiz.id,'magenta')}]: ${quiz.question} ${colorize('=>','magenta')} ${quiz.answer}`);
	})
	.catch(error => {
		errorlog(error.message);
	})
	.then(() => {
		rl.prompt();	
	});
};

exports.playCmd=rl=>{
	
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
			log('No hay nada mas que preguntar.');
			log('Fin del examen. Aciertos:');							
			log(score,'magenta');
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
					log("Su respuesta es correcta");
					log(`CORRECTO - Lleva ${score} aciertos.`);
					playOne();
				}
				else{
					log("Su respuesta es incorrecta");
					log('INCORRECTO');
					log('Fin del examen. Aciertos:');
					//biglog(`${colorize(score,'magenta')}`);
					log(`${colorize(score,'magenta')}`);
					rl.prompt();
				}
				rl.prompt();
			});			
	
		}
	}

	
};

exports.testCmd= (rl,id) =>{
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
        			biglog('CORRECTA','green');
			}else{
				biglog('INCORRECTA','red');
			}
		});
	})
	.catch(Sequelize.ValidationError, error => {
   		errorlog('El quiz es erróneo: ');
    		error.errors.forEach(({message}) => errorlog(message));
  	})
  	.catch(error => {
   	 	errorlog(error.message);
  	})
  	.then(() => {
    		rl.prompt();
  	});				
};


exports.deleteCmd=(rl,id)=>{
	validateId(id)
  	.then(id => models.quiz.destroy({where: {id}}))
  	.catch(error => {
    		errorlog(error.message);
  	})
  	.then(() => {
    		rl.prompt();
	});
};

exports.editCmd = (rl, id) => {
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
    		log(`Se ha cambiado el quiz ${colorize(quiz.id, 'magenta')} por: ${quiz.question} ${colorize(' => ', 'magenta')} ${quiz.answer}`);
  	})
  	.catch(Sequelize.ValidationError, error => {
   		errorlog('El quiz es erróneo: ');
    		error.errors.forEach(({message}) => errorlog(message));
  	})
  	.catch(error => {
   	 	errorlog(error.message);
  	})
  	.then(() => {
    		rl.prompt();
  	});
};

exports.creditsCmd=rl=>{
	log('Autores de las practicas:');
	log('Marta','green');
	rl.prompt();
};






