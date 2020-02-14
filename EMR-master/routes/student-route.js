const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const EMR_User = mongoose.model('emr-users');
const PatientMasterModel = mongoose.model('patient');
const PatientStudentModel = mongoose.model('patientStudent');
const NursingAssessmentModel = mongoose.model('assessmentModel');
const MasterVital = mongoose.model('masterVital');
const MasterBraden = mongoose.model('masterBraden');
const MasterEnteral = mongoose.model('masterEnteral');
const MasterIV= mongoose.model('masterIV');
const MasterIO = mongoose.model('masterIO');
const MasterOutput = mongoose.model('masterOutput');
const MasterFall = mongoose.model('masterFall');
const MasterOxygen = mongoose.model('masterOxygen');
const MasterPain = mongoose.model('masterPain');
const MasterWH = mongoose.model('masterWh');
const DoctorOrders = mongoose.model('doctorsOrders');
const MasterMNA = mongoose.model('masterMNA');
const MasterWound = mongoose.model('masterWound');
// MDP
const StudentMDP = mongoose.model('studentMDP');
const MasterMDP = mongoose.model('masterMDP');
const MasterHistory = mongoose.model('masterHistoryTrack');
const StudentHistory = mongoose.model('studentHistoryTrack');
// Care Plan
const StudentCarePlan = mongoose.model('studentCarePlan');
const MasterDiabetic = mongoose.model('masterDiabetic');
const MasterNeuro = mongoose.model('masterNeuro');
// CLC
const MasterGcs = mongoose.model('masterGcs');
const MasterClcVital = mongoose.model('masterClcVital');
const MasterPupils = mongoose.model('masterPupils');
const MasterMotorStrength = mongoose.model('masterMotorStrength');
//Feeding Regime & Schedule
const MasterFeedingRegime = mongoose.model('masterFeedingRegime');
const MasterScheduleFeed = mongoose.model('masterScheduleFeed');
const MasterFluidRegime = mongoose.model('masterFluidRegime');
const MasterScheduleFluid = mongoose.model('masterScheduleFluid');
// Discharge Planning
const StudentDischargePlanning = mongoose.model('studentDischargePlanning');
const StudentAppointment = mongoose.model('studentAppointment');
const MasterDischargePlanning = mongoose.model('masterDischargePlanning');
const MasterAppointment = mongoose.model('masterAppointment');

const moment = require('moment');
const alertMessage = require('../helpers/messenger');
const  hbsSecurity = require("../helpers/hbsSecurity");
const {ensureAuthenticated, ensureAuthorised} = require('../helpers/auth');
const toaster = require('../helpers/Toaster');

// imports standardID
const standardID = require('standardid');

/*function setAlertMessage(res, message, icon, dismissable){
 let alert = res.flashMessenger.success(message);
 alert.titleIcon = icon;
 alert.canBeDismissed = dismissable;
 }*/

// Shows list of student patient documents
router.get('/list-patients', ensureAuthenticated, (req, res) => {
	console.log('\nStudent list patient:');
	console.log(req.user);
	
	/*
	 1. Retrieve all patient records belonging to this particular student
	 2. Retrieve all master records for students to customise
	 * Note: All master patient records are retrieved in current version. In future, may only retrieve those that
	 * belong to a particular tutorial group or other criteria.
	 */
	/*PatientStudentModel.find({user: req.user._id}) // req.user_id is self generated
	 .then(studentPatients => {
	 res.render('student/student-list-patients', {
	 studentPatients: studentPatients
	 });
	 });*/
	
	PatientStudentModel.find({user: req.user._id}) // req.user_id is self generated
	.then(studentPatients => {
		PatientMasterModel.find()
		.then(patients => {
			res.render('student/student-list-patients', {
				patients: hbsSecurity.hbsFixArr(patients),
				studentPatients: hbsSecurity.hbsFixArr(studentPatients),
				toaster: req.session.toaster,
				showMenu: false
			});
			req.session.toaster = null; // reset toaster
		})
	});
});

// Retrieve and show master patient record to let Student customise
router.get('/customise/:patientID', ensureAuthenticated, (req, res) => {
	PatientMasterModel.findOne({
		patientID: req.params.patientID
	})
	.then(patient => {
		req.session.patient = patient; // Master record!!!
		/*console.log(`User id: ${req.user.id}`);
		 console.log(`Patient created by user id: ${patient.user._id}`);*/
		res.render('student/customise-patient', { // calls handlebars
			patient: hbsSecurity.hbsFix(patient),
			showMenu: false		// hides patient menu
		});
	});
});


// Retrieve and show customised patient record for student to edit own record
router.get('/showown/:recordID/:patientID', ensureAuthenticated, (req, res) => {
	userType = req.user.userType == 'student';

	// enable edit of nursing assessment here
	console.log(`Patient ID from Show Own: ${req.params.patientID}`);
	PatientStudentModel.findOne({
		recordID: req.params.recordID
	})
	.populate('user')
	.then(retrievedPatient => {
		
		// check if logged in user is owner of this patient record
		if((JSON.stringify(retrievedPatient.user._id) !== JSON.stringify(req.user.id)) && (req.user.userType != "staff")) {
			/*let alert = res.flashMessenger.success('Only allowed to edit own record');
			 alert.titleIcon = 'far fa-thumbs-up';
			 alert.canBeDismissed = true;*/
			//alertMessage.flashMessage(res, 'Only allowed to edit own record', 'fas fa-exclamation', true);
			toaster.setErrorMessage(' ', 'Only allowed to edit own record');
			res.redirect('/student/list-patients');
		} 
		else {
			userType = req.user.userType == 'student';

			if (req.user.userType == 'staff') // if it's a staff, change userType to student so that the navbar is changed to student route
			{
				userType = 'student';
			}
			req.session.patient = retrievedPatient;
			PatientStudentModel.findOne({
				// patientID: req.params.patientID			// gets current user
				recordID: req.params.recordID
			})
			.populate('user')							// gets user from emr-users collection
			.then(patient => {
				
				if (patient.creatorEmail != null)
				{
					req.session.firstNameAndEmail = patient.creator + " (" + patient.creatorEmail.split("@")[0] + ")" // firstName + email
				}
				else
				{
					req.session.firstNameAndEmail = "";
				}

				res.render('student/student-edit-patient', { // calls handlebars
					recordID: req.params.recordID,
					patient: hbsSecurity.hbsFix(retrievedPatient),
					userType: userType,
					currentUserType: req.user.userType,
						studentFirstName: req.session.firstNameAndEmail,
					showMenu: true
				});
			});
		}
	});
});


// Save student edited patient record, selected from Student Records table at the top
router.put('/save-student-edited-patient/:recordID', ensureAuthenticated, (req, res) => {

	userType = req.user.userType == 'student';
	PatientStudentModel.findOne({
		recordID: req.params.recordID
	})
	.populate('user')
	.then(studentPatient => {
		
		if(JSON.stringify(studentPatient.user._id) !== JSON.stringify(req.user.id)) {
			//alertMessage.flashMessage(res, 'Only allowed to edit own record', 'fas fa-exclamation', true);
			toaster.setErrorMessage(' ', 'Only allowed to edit own record');
			res.redirect('/student/list-patients');
		} else {
			
			PatientMasterModel.findOne({patientID: studentPatient.patientID})
			.then(patientMaster => { // get Master ID
				// New values Biography
				//studentPatient.nric = req.body.nric;
				//studentPatient.familyName = req.body.familyName;
				//studentPatient.givenName = req.body.givenName;
				studentPatient.dateCreated = moment(new Date(), 'DD/MM/YYYY', true)
				.format();
				studentPatient.dob = moment(req.body.dob, 'DD/MM/YYYY', true)
				.format();
				studentPatient.gender = req.body.gender;
				studentPatient.weight = req.body.weight;
				studentPatient.height = req.body.height;
				studentPatient.address = req.body.address;
				studentPatient.postalCode = req.body.postalCode;
				studentPatient.mobilePhone = req.body.mobilePhone;
				studentPatient.homePhone = req.body.homePhone;
				studentPatient.officePhone = req.body.officePhone;
				// admission
				studentPatient.ward = req.body.ward;
				studentPatient.bed = req.body.bed;
				studentPatient.admDate = moment(req.body.admDate, 'DD/MM/YYYY', true)
				.format();
				studentPatient.policeCase = req.body.policeCase;
				studentPatient.admFrom = req.body.admFrom;
				studentPatient.modeOfArr = req.body.modeOfArr;
				studentPatient.accompBy = req.body.accompBy;
				studentPatient.caseNotes = req.body.caseNotes;
				studentPatient.xRaysCD = req.body.xRaysCD;
				studentPatient.prevAdm = req.body.prevAdm;
				studentPatient.condArr = req.body.condArr;
				studentPatient.otherCond = req.body.otherCond;
				studentPatient.ownMeds = req.body.ownMeds;
				studentPatient.unableAssess = req.body.unableAssess;
				studentPatient.adviceMeds = req.body.adviceMeds;
				// psycho-social
				studentPatient.emgName = req.body.emgName;
				studentPatient.emgRel = req.body.emgRel;
				studentPatient.emgMobile = req.body.emgMobile;
				studentPatient.emgHome = req.body.emgHome;
				studentPatient.emgOffice = req.body.emgOffice;
				
				studentPatient.careName = req.body.careName;
				studentPatient.careRel = req.body.careRel;
				studentPatient.careOccu = req.body.careOccu;
				studentPatient.careMobile = req.body.careMobile;
				studentPatient.careHome = req.body.careHome;
				studentPatient.careOffice = req.body.careOffice;
				
				studentPatient.accomodation = req.body.accomodation;
				studentPatient.hospConcerns = req.body.hospConcerns;
				studentPatient.spiritConcerns = req.body.spiritConcerns;
				studentPatient.prefLang = req.body.prefLang;
				studentPatient.otherLang = req.body.otherLang;
				studentPatient.masterID = patientMaster.user;
				studentPatient.creator = req.user.firstName;
				studentPatient.creatorEmail = req.user.email;
				
				studentPatient.save()
				.then(patient => {
					//alertMessage.flashMessage(res, 'Patient record successfully saved', 'far fa-thumbs-up', true);
					toaster.setSuccessMessage(' ', 'Patient (' + patient.givenName + ' ' + patient.familyName + ') Customised' +
						' Record Updated');
					//res.redirect('/student/list-patients');
					res.render('student/student-edit-patient', { // calls student-edie-patient.handlebars
						patient: hbsSecurity.hbsFix(patient),
						toaster,
						showMenu: true,
						userType: userType,
						recordID: req.params.recordID
					});
				});
			});
		}
	});
});


// Save student customised master patient document to PatientStudent collection
// When student selects from Master Records table at the bottom
router.put('/save-customised-patient/:patientID', ensureAuthenticated, (req, res) => {
	/*console.log('\n/User in req: ===========');
	 console.log(req.user);*/
	recordID = req.params.patientID + '-' + (new standardID('S0000')).generate();
	console.log(recordID); 
	let patient = req.session.patient;
	console.log ('========== Nursing Assessment ID: ' +  patient.nursingAssessmentID);
	NursingAssessmentModel.findById(patient.nursingAssessmentID)
	.then(assessment => {
		new NursingAssessmentModel({
			// Neurosensory
			mentalStatus: assessment.mentalStatus,
			mentalOthers: assessment.mentalOthers,
			orientedTo: assessment.orientedTo,
			hearing: assessment.hearing,
			hearingOthers: assessment.hearingOthers,
			hearingUnable: assessment.hearingUnable,
			vision: assessment.vision,
			visionOthers: assessment.visionOthers,
			visionUnable: assessment.visionUnable,
			speech: assessment.speech,
			
			// Respiratory
			breathingPattern: assessment.breathingPattern,
			breathingRemarks: assessment.breathingRemarks,
			breathingPresence: assessment.breathingPresence, // none required
			cough: assessment.cough,
			sputum: assessment.sputum,
			
			// Circulatory
			pulse: assessment.pulse,
			cirPresence: assessment.cirPresence,
			oedema: assessment.odema,
			extremities: assessment.extremities,
			pacemaker: assessment.pacemaker,
			paceMakerManu: assessment.paceMakerManu,
			
			// Gastrointestinal
			dietType: assessment.dietType,
			dietOthers: assessment.dietOthers,
			fluidRestriction: assessment.fluidRestriction,
			fluidSpecify: assessment.fluidSpecify,
			fluidUnable: assessment.fluidUnable,
			oralCavity: assessment.oralCavity,
			dentures: assessment.dentures,
			oralCavityPresence: assessment.oralCavityPresence,
			oralCavityOthers: assessment.oralCavityOthers,
			
			// Elimination
			bowel: assessment.bowel,		// none required
			bowelOthers: assessment.bowelOthers,
			urinaryAppearance: assessment.urinaryAppearance,
			urinaryRemarks: assessment.urinaryRemarks,
			urinaryPresence: assessment.urinaryPresence,	// none required
			urinaryOthers: assessment.urinaryOthers,
			adaptiveAids: assessment.adaptiveAids,		// none required
			catType: assessment.catType,
			catSize: assessment.catSize,
			dayLastChanged: assessment.dayLastChanged,
			
			// Sleep
			sleep: assessment.sleep,
			sleepSpecify: assessment.sleepSpecify,
			
			// Pain Assessment
			painPresent: assessment.painPresent,
			painScale: assessment.painScale,
			duration: assessment.duration,
			onset: assessment.onset,
			location: assessment.location,
			characteristic: assessment.characteristic,
			symptoms: assessment.symptoms,
			factors: assessment.factors,
			treatment: assessment.treatment,
		}).save()
		.then(assessment => {
			console.log('New Assessment saved : ' + assessment);
			EMR_User.findById(req.user._id)	// findById is Mongoose utility method
			.then(user => {
				/*console.log('\n/addPatient user found: ===========');
				 console.log(user);
				 */
				console.log("req.params.patientID: "+ req.params.patientID);

				PatientMasterModel.findOne({patientID: req.params.patientID})
				.then(patientMaster => {
					new PatientStudentModel({
						recordID: recordID,
						patientID: req.params.patientID,
						user: user._id,
						nursingAssessmentID: assessment._id,
						nric: req.body.nric,
						
						familyName: req.body.familyName,
						givenName: req.body.givenName,
						dob: moment(req.body.dob, 'DD/MM/YYYY', true).format(),
						gender: req.body.gender,
						weight: req.body.weight,
						height: req.body.height,
						address: req.body.address,
						postalCode: req.body.postalCode,
						mobilePhone: req.body.mobilePhone,
						homePhone: req.body.homePhone,
						officePhone: req.body.officePhone,
						
						ward: req.body.ward,
						bed: req.body.bed,
						admDate: moment(req.body.admDate, 'DD/MM/YYYY', true).format(),
						policeCase: req.body.policeCase,
						admFrom: req.body.admFrom,
						modeOfArr: req.body.modeOfArr,
						accompBy: req.body.accompBy,
						caseNotes: req.body.caseNotes,
						xRaysCD: req.body.xRaysCD,
						prevAdm: req.body.prevAdm,
						condArr: req.body.condArr,
						otherCond: req.body.otherCond,
						ownMeds: req.body.ownMeds,
						unableAssess: req.body.unableAssess,
						adviceMeds: req.body.adviceMeds,
						
						emgName: req.body.emgName,
						emgRel: req.body.emgRel,
						emgMobile: req.body.emgMobile,
						emgHome: req.body.emgHome,
						emgOffice: req.body.emgOffice,
						
						careName: req.body.careName,
						careRel: req.body.careRel,
						careOccu: req.body.careOccu,
						careMobile: req.body.careMobile,
						careHome: req.body.careHome,
						careOffice: req.body.careOffice,
						
						accomodation: req.body.accomodation,
						hospConcerns: req.body.hospConcerns,
						spiritConcerns: req.body.spiritConcerns,
						prefLang: req.body.prefLang,
						otherLang: req.body.otherLang,
						creator: req.user.firstName,
						creatorEmail: req.user.email,

						masterID: patientMaster.user // storing masterID
					})
					.save()
				})
				
				.then(user => {
					MasterVital.find({ patientID: req.params.patientID }).then(vitalData => {
						MasterPain.find({ patientID: req.params.patientID }).then(painData => {
							MasterOxygen.find({ patientID: req.params.patientID }).then(oxyData => {
								MasterWH.find({ patientID: req.params.patientID }).then(whData => {
									
									vitalData.forEach(vital => {
										new MasterVital({
											patientID: recordID,
											vitalID: (new standardID('AAA0000')).generate(),
											userID: req.user.id,
											date: vital.date,
											time: vital.time,
											datetime: vital.datetime,
											temp: vital.temp,
											tempRoute: vital.tempRoute,
											heartRate: vital.heartRate,
											resp: vital.resp,
											sbp: vital.sbp,
											dbp: vital.dbp,
											sbpArterial: vital.sbpArterial,
											dbpArterial: vital.dbpArterial,
											bPressure: vital.bPressure,
											arterialBP: vital.arterialBP,
											bpLocation: vital.bpLocation,
											bpMethod: vital.bpMethod,
											patientPosition: vital.patientPosition,
											userType: req.user.userType
										}).save();
									})

									painData.forEach(pain => {
										new MasterPain({
											patientID: recordID,
											painID: (new standardID('AAA0000')).generate(),
											userType: req.user.userType,
											datetime: pain.datetime,
											date: pain.date,
											time: pain.time,
											painScale: pain.painScale,
											painScore: pain.painScore,
											onset: pain.onset,
											location: pain.location,
											duration: pain.duration,
											characteristics: pain.characteristics,
											associatedSymp: pain.associatedSymp,
											aggravatingFact: pain.aggravatingFact,
											relievingFact: pain.relievingFact,
											painIntervene: pain.painIntervene,
											responseIntervene: pain.responseIntervene,
											siteofpain : pain.siteofpain
										}).save();
									})

									oxyData.forEach(oxy => {
										new MasterOxygen({
											patientID: recordID,
											oxygenID: (new standardID('AAA0000')).generate(),
											userType: req.user.userType,
											datetime: oxy.datetime,
											date: oxy.date,
											time: oxy.time,
											o2Device: oxy.o2Device,
											humidifier: oxy.humidifier,
											o2Amt: oxy.o2Amt,
											fio2: oxy.fio2,
											spo2: oxy.spo2
										}).save();
									})

									whData.forEach(wh => {
										new MasterWH({
											patientID:recordID,
											whID: (new standardID('AAA0000')).generate(),
											userType: req.user.userType,
											datetime: wh.datetime,
											date: wh.date,
											time: wh.time,
											height: wh.height,
											heightEst: wh.heightEst,
											weight: wh.weight,
											weightEst: wh.weightEst,
											bsa: wh.bsa,
											bmi: wh.bmi
										}).save();
									})
								}).then(vitalSuccess => {
									DoctorOrders.find({ patientID: req.params.patientID }).then(docOrders => {
										docOrders.forEach(orders => {
											new DoctorOrders({
												patientID: recordID,
												orderID: (new standardID('AAA0000')).generate(),
												userType: req.user.userType,
												datetime: orders.datetime,
												date: orders.date,
												time: orders.time,
												orders: orders.orders,
												status: orders.status,
												uploadUrl: orders.uploadUrl
											}).save();
										})
									}).then(orders => {
											MasterIO.find({ patientID: req.session.patient.patientID }).then(ioDatas => {
												MasterEnteral.find({ patientID: req.session.patient.patientID }).then(enteralDatas => {
													MasterIV.find({ patientID: req.session.patient.patientID }).then(ivDatas => {
														MasterOutput.find({ patientID: req.session.patient.patientID }).then(outputDatas => {
														ioDatas.forEach(io => {
															new MasterIO({
																patientID: recordID,
																ioID: (new standardID('AAA0000')).generate(),
																date: io.date,
																time: io.time,
																datetime: io.datetime,
																intakefood: io.intakefood,
																foodtype: io.foodtype,
																foodportion: io.foodportion,
																fluidtype: io.fluidtype,
																fluidportion: io.fluidportion
															}).save();
														})

														enteralDatas.forEach(enteral => {
															new MasterEnteral({
																patientID: recordID,
																enteralID: (new standardID('AAA0000')).generate(),
																date: enteral.date,
																time: enteral.time,
																datetime: enteral.datetime,
																enteralfeed: enteral.enteralfeed,
																formula: enteral.formula,
																feedamt: enteral.feedamt,
																flush: enteral.flush	
															}).save();
														})

														ivDatas.forEach(iv => {
															new MasterIV({
																patientID: recordID,
																ivID: (new standardID('AAA0000')).generate(),
																date: iv.date,
																time: iv.time,
																datetime: iv.datetime,
																coninf: iv.coninf,
																conamt: iv.conamt,
																intinf: iv.intinf,
																amtinf: iv.amtinf,
																ivflush: iv.ivflush
															}).save();
														})

														outputDatas.forEach(output => {
															new MasterOutput({
																patientID: recordID,
																outputID: (new standardID('AAA0000')).generate(),
																date: output.date,
																time: output.time,
																datetime: output.datetime,
																urineamt: output.urineamt,
																urineass: output.urineass,
																stoolamt: output.stoolamt,
																stoolass: output.stoolass,
																vomitamt: output.vomitamt,
																vomitass: output.vomitass,
																bloodamt: output.bloodamt,
																diaper: output.diaper,
																otheramt: output.otheramt,
																otherass: output.otherass
															}).save();
														})

													}).then(ioSuccess => {
														MasterBraden.find({ patientID: req.params.patientID }).then(bradenData => {
															bradenData.forEach(braden => {
																
																new MasterBraden({
																	patientID: recordID,
																	bradenID: (new standardID('AAA0000')).generate(),
																	date: braden.date,
																	datetime: braden.datetime,
																	sensePerc: braden.sensePerc,
																	moisture: braden.moisture,
																	activity: braden.activity,
																	mobility: braden.mobility,
																	nutrition: braden.nutrition,
																	fns: braden.fns,

																	sensePercSplit: braden.sensePercSplit,
																	moistureSplit: braden.moistureSplit,
																	activitySplit: braden.activitySplit,
																	mobilitySplit: braden.mobilitySplit,
																	nutritionSplit: braden.nutritionSplit,
																	fnsSplit: braden.fnsSplit,

																	total: braden.total
																}).save();
															})
														}).then(bradenSuccess => {
															MasterFall.find({ patientID: req.params.patientID }).then(fallData => {
																fallData.forEach(fall => {
																	
																	new MasterFall({
																		patientID: recordID,
																		fallID: (new standardID('AAA0000')).generate(),
																		date: fall.date,
																		datetime: fall.datetime,
																		history: fall.history,
																		secondary: fall.secondary,
																		ambu: fall.ambu,
																		ivhl: fall.ivhl,
																		gait: fall.gait,
																		mental: fall.mental,

																		historySplit: fall.historySplit,
																		secondarySplit: fall.secondarySplit,
																		ambuSplit: fall.ambuSplit,
																		ivhlSplit: fall.ivhlSplit,
																		gaitSplit: fall.gaitSplit,
																		mentalSplit: fall.mentalSplit,

																		totalmf: fall.totalmf
																	}).save();
																	})
																}).then(diabeticsucc => {
																	MasterDiabetic.find({ patientID: req.params.patientID }).then(diabeticDatas => {
																		diabeticDatas.forEach(diabetic => {
																			// splitpoc = req.body.poc.splice(0,2);
																			new MasterDiabetic({
																				patientID: recordID,
																				diabeticID:  (new standardID('AAA0000')).generate(),
																				date: diabetic.date,
																				datetime: diabetic.datetime,
																				time: diabetic.time,
																				poc: diabetic.poc,
																				bgl: diabetic.bgl,
																				insulintype: diabetic.insulintype,
																				insulinamt: diabetic.insulinamt,
																				hypoagent: diabetic.hypoagent,
																				splitpoc: diabetic.splitpoc,

																			}).save();
																		})
																	}).then(neurosucc => {
																		MasterNeuro.find({ patientID: req.params.patientID }).then(neuroDatas => {		
																			neuroDatas.forEach(neuro => {
																				// splitpoc = req.body.poc.splice(0,2);
																				new MasterNeuro({
																					patientID: recordID,
																					neuroID:  (new standardID('AAA0000')).generate(),
																					datetime: neuro.datetime,
																					date: neuro.date,
																					time: neuro.time,
																					siteOfInjury: neuro.siteOfInjury,
																					colourLeft: neuro.colourLeft,
																					colourRight: neuro.colourRight,

																					temperatureLeft: neuro.temperatureLeft,
																					temperatureRight: neuro.temperatureRight,
																					capillaryRefillLeft: neuro.capillaryRefillLeft,
																					capillaryRefillRight: neuro.capillaryRefillRight,
																					peripheralPulseLeft: neuro.peripheralPulseLeft,
																					peripheralPulseRight: neuro.peripheralPulseRight,
																					edemaLeft: neuro.edemaLeft,
																					edemaRight: neuro.edemaRight,
																					movementLeft: neuro.movementLeft,
																					movementRight: neuro.movementRight,
																					sensationLeft: neuro.sensationLeft,
																					sensationRight: neuro.sensationRight,
																					painScale: neuro.painScale,
																					numericalRatingScaleLeft: neuro.numericalRatingScaleLeft,
																					numericalRatingScaleRight: neuro.numericalRatingScaleRight,
																					characteristicLeft: neuro.characteristicLeft,
																					characteristicRight: neuro.characteristicRight
																				}).save();
																			})
																		}).then(clcsucc => {
																			MasterGcs.find({ patientID: req.session.patient.patientID }).then(gcsDatas => {
																				MasterClcVital.find({ patientID: req.session.patient.patientID }).then(clcvitalDatas => {
																					MasterPupils.find({ patientID: req.session.patient.patientID }).then(pupilsDatas => {
																						MasterMotorStrength.find({ patientID: req.session.patient.patientID }).then(motorstrengthData => {
																							gcsDatas.forEach(gcs => {
																							new MasterGcs({
																								patientID: recordID,
																								gcsID: (new standardID('AAA0000')).generate(),
																								date: gcs.date,
																								time: gcs.time,
																								datetime: gcs.datetime,
																								eyeopen: gcs.eyeopen,
																								bestverbal: gcs.bestverbal,
																								bestmotor: gcs.bestmotor,
																								spliteyeopen:gcs.spliteyeopen,
																								splitbestverbal:gcs.splitbestverbal,
																								splitbestmotor:gcs.splitbestmotor,
																								totalgcs: gcs.totalgcs
																							}).save();
																						})
								
																						clcvitalDatas.forEach(clcvital => {
																							new MasterClcVital({
																								patientID: recordID,
																								clcvitalID: (new standardID('AAA0000')).generate(),
																								date: clcvital.date,
																								time: clcvital.time,
																								datetime: clcvital.datetime,
																								heartRate: clcvital.heartRate,
																								resp: clcvital.resp,
																								sbp: clcvital.sbp,
																								dbp: clcvital.dbp,
																								bloodp: clcvital.bloodp
																							}).save();
																						})
								
																						pupilsDatas.forEach(pupils => {
																							new MasterPupils({
																								patientID: recordID,
																								pupilsID: (new standardID('AAA0000')).generate(),
																								date: pupils.date,
																								time: pupils.time,
																								datetime: pupils.datetime,
																								sizeright: pupils.sizeright,
																								sizeleft: pupils.sizeleft,
																								reactionright: pupils.reactionright,
																								reactionleft: pupils.reactionleft
																							}).save();
																						})
								
																						motorstrengthData.forEach(motorstrengthData => {
																							new MasterMotorStrength({
																								patientID: recordID,
																								motorstrengthID: (new standardID('AAA0000')).generate(),
																								date: motorstrengthData.date,
																								time: motorstrengthData.time,
																								datetime: motorstrengthData.datetime,
																								strengthrightarm: motorstrengthData.strengthrightarm,
																								strengthleftarm: motorstrengthData.strengthleftarm,
																								strengthrightleg: motorstrengthData.strengthrightleg,
																								strengthleftleg: motorstrengthData.strengthleftleg,

																								splitstrengthrightarm: motorstrengthData.splitstrengthrightarm,
																								splitstrengthleftarm: motorstrengthData.splitstrengthleftarm,
																								splitstrengthrightleg: motorstrengthData.splitstrengthrightleg,
																								splitstrengthleftleg: motorstrengthData.splitstrengthleftleg,
																								totalms: motorstrengthData.totalms
																						
																							}).save();
																						})
																					}).then(feedingSched => {
																							MasterFeedingRegime.find({ patientID: req.params.patientID }).then(feedingDatas => {
																								MasterScheduleFeed.find({ patientID: req.params.patientID }).then(scheduleDatas => {
																								feedingDatas.forEach(feeding => {
																									new MasterFeedingRegime({
																										patientID: recordID,
																										feedID:  (new standardID('AAA0000')).generate(),
																										date: feeding.date,
																										datetime: feeding.datetime,
																										time: feeding.time,
																										typeofFormula: feeding.typeofFormula,
																										enteralFeed: feeding.enteralFeed,
																										ordersFeed: feeding.ordersFeed,
																					
																									}).save();
																								})
																								scheduleDatas.forEach(sched => {
																									new MasterScheduleFeed({
																										patientID: recordID,
																										scheduleID:  (new standardID('AAA0000')).generate(),
																										date: sched.date,
																										datetime: sched.datetime,
																										time: sched.time,
																										scheduleFeed: sched.scheduleFeed,
																										scheduleAmt: sched.scheduleAmt,
																										scheduleFlush: sched.scheduleFlush,
																										schedcomments: sched.schedcomments,
																												
																									}).save();
																								})
																																		
																							}).then(newStudentPatient => {
																								
																								/*let alert = res.flashMessenger.success('New student patient record added');
																								alert.titleIcon = 'far fa-thumbs-up';
																								alert.canBeDismissed = true;
																								*/
																								//req.session.patient = newStudentPatient;
																								//alertMessage.flashMessage(res, 'New student patient record added', 'far fa-thumbs-up', true);
																								toaster.setSuccessMessage(' ', 'New Customised Record Created From Master');
																								req.session.toaster = toaster;
																								res.redirect('/student/list-patients');
																								// redirect will activate router while render activates specific handlebar
																							});
																							
																							
																						})
																					})
																				})
																			})
																		})
																	}).then(dischargePlanningSucc => {
																		MasterDischargePlanning.find({	patientID: req.session.patient.patientID }).then(dischargePlanningDatas => {
																			MasterAppointment.find({	patientID: req.session.patient.patientID }).then(appointmentDatas => {
																				dischargePlanningDatas.forEach(dp => {
																					new StudentDischargePlanning({
																						patientID: recordID,
																						dischargePlanningID: (new standardID('AAA0000')).generate(),
																						datetime: dp.datetime,
																						date: dp.date,
																						time: dp.time,
																						// 1
																						dischargePlan: dp.dischargePlan,
																						dischargeCondition: dp.dischargeCondition,
																						// 2
																						dischargeTo: dp.dischargeTo,
																						dischargeToSpecify: dp.dischargeToSpecify,
																						// 3
																						accompaniedBy: dp.accompaniedBy,
																						accompaniedBySpecify: dp.accompaniedBySpecify,
																						// 4
																						modeOfTransport: dp.modeOfTransport,
																						modeOfTransportSpecify: dp.modeOfTransportSpecify,
																						// 5
																						removalOf: dp.removalOf,
																						// 6
																						checkedAndReturned: dp.checkedAndReturned,
																						checkedAndReturnedAppliancesSpecify: dp.checkedAndReturnedAppliancesSpecify,
																						checkedAndReturnedSpecify: dp.checkedAndReturnedSpecify,
																						// 7
																						adviceGivenOn: dp.adviceGivenOn,
																						// Others Specify
																						othersSpecify: dp.othersSpecify,
																						// Referrals
																						referrals: dp.referrals,
																						referralsSpecify: dp.referralsSpecify,
																						// Medical Cert No
																						medicalCertificateNo: dp.medicalCertificateNo,
																						// Specify Instructions
																						specifyInstructions: dp.specifyInstructions
																					}).save();
																				
																				})

																				appointmentDatas.forEach(ad => {
																					new StudentAppointment({
																						patientID: recordID,
																						appointmentID: (new standardID('AAA0000')).generate(),
																						datetime: ad.datetime,
																						date: ad.date,
																						time: ad.time,
																						// Follow-up Appointment
																						followUpAppointment: ad.followUpAppointment,
																						followUpAppointmentSpecify: ad.followUpAppointmentSpecify,
																						clinic: ad.clinic,
																						nameOfDoctor: ad.nameOfDoctor,
																						memoGiven: ad.memoGiven,
																						remarks: ad.remarks,
																					}).save();
																				})
																			})
																		})
																	})
																}).then(woundChart => {
																	/// change to wound WED WORK
																	MasterWound.find({ patientID: req.params.patientID }).then(woundData => {
																		woundData.forEach(wound => {
																			
																			new MasterWound({
																				patientID: recordID,
																				woundID: (new standardID('AAA0000')).generate(),
																				date: wound.date,
																				time: wound.time,
																				gender: wound.gender,
																				woundLabel: wound.woundLabel,
																				markerID: wound.markerID,
																				woundP1: wound.woundP1,
																				woundP2: wound.woundP2,
																				woundCat: wound.woundCat,
																				woundtype: wound.woundtype,
																				woundLocation: wound.woundLocation,
																				woundL: wound.woundL,
																				woundW: wound.woundW,
																				woundD: wound.woundD,
																				wounddrain: wound.wounddrain,
																				woundodor: wound.woundodor,
																				woundedges: wound.woundedges,
																				periwound: wound.periwound,
																				dresswound: wound.dresswound,
																				solutionsU: wound.solutionsU,
																				interventions: wound.interventions,
																				patientresponse: wound.patientresponse,
																				woundremarks: wound.woundremarks,
																				woundstatus: wound.woundstatus
																																									
																			}).save();
																		})
																	})
																}).then(mnaForm => {
																	MasterMNA.find({ patientID: req.params.patientID }).then(mnaData => {
																		mnaData.forEach(mnaRecord => {

																			new MasterMNA({
																				patientID: recordID,
																				mnaID: (new standardID('AAA0000')).generate(),
																				datetime: mnaRecord.datetime,
																				date: mnaRecord.date,
																				time: mnaRecord.time,
																				foodIntake: mnaRecord.foodIntake,
																				weightLoss: mnaRecord.weightLoss,
																				mobility: mnaRecord.mobility,
																				psych: mnaRecord.psych,
																				neuroPsych: mnaRecord.neuroPsych,
																				BMI: mnaRecord.BMI,
																				foodIntakefull: mnaRecord.foodIntakefull,
																				weightLossfull: mnaRecord.weightLossfull,
																				mobilityfull: mnaRecord.mobilityfull,
																				psychfull: mnaRecord.psychfull,
																				neuroPsychfull: mnaRecord.neuroPsychfull,
																				screenScore: mnaRecord.screenScore,
																				liveInd: mnaRecord.liveInd,
																				drugs: mnaRecord.drugs,
																				ulcers: mnaRecord.ulcers,
																				fullmeals: mnaRecord.fullmeals,
																				dairy: mnaRecord.dairy,
																				eggs: mnaRecord.eggs,
																				meats: mnaRecord.meats,
																				vegetal: mnaRecord.vegetal,
																				fluids: mnaRecord.fluids,
																				feeding: mnaRecord.feeding,
																				nutrition: mnaRecord.nutrition,
																				healthStat: mnaRecord.healthStat,
																				mac: mnaRecord.mac,
																				cc: mnaRecord.cc,
																				assessmentScore: mnaRecord.assessmentScore,
																				liveIndfull: mnaRecord.liveIndfull,
																				drugsfull: mnaRecord.drugsfull,
																				ulcersfull: mnaRecord.ulcersfull,
																				fullmealsfull: mnaRecord.fullmealsfull,
																				nutritionfull: mnaRecord.nutritionfull,
																				vegetalfull: mnaRecord.vegetalfull,
																				fluidsfull: mnaRecord.fluidsfull,
																				feedingfull: mnaRecord.feedingfull,
																				healthStatfull: mnaRecord.healthStatfull,
																				macfull: mnaRecord.macfull,
																				ccfull: mnaRecord.ccfull,
																				totalScore: mnaRecord.totalScore,

																			}).save();
																		})
																	})
																})
															})
														})
													})
												})
											})
										})
									})
								})
							})
						})
					})
				})
			});
		});
	});
});

// shows the add patient form
router.get('/add-patient', (req, res) => {
	res.render('master/master-add-patient');	// handlebar!!
});


router.get('/search', (req, res) => {
	res.render('story/search');
})

router.post('/getStory', (req, res) => {
	Story.find({title: req.body.title})
	.populate('user') // select Story.*, User.* from Story, User where Story.user.id = User.user.id
	.then(stories => {
		console.log('\n\n====== find() from /getStory ======');
		/*		console.log(stories[0].title);
		 console.log(stories[0].user.lastName);*/
		
		stories.forEach(function(story){
			console.log('============================');
			console.log(story.title);
			console.log(story.body);
			console.log(story.user.firstName);
			console.log(story.user.lastName);
		});
		res.render('story/list', {
			stories: hbsSecurity.hbsFixArr(stories)
		});
	});

// Accessing object returned by Mongoose find() and findOne() methods
	/*	Story.findOne({title: req.body.title})
	 .populate('user') // select Story.*, User.* from Story, User where Story.user.id = User.user.id
	 .then(story => {
	 console.log('\n\n====== findOne() from /getStory ======');
	 console.log(`Title: ${story.title} || Name: ${story.user.lastName}`);
	 });
	 
	 Story.find({title: req.body.title})
	 .populate('user') // select Story.*, User.* from Story, User where Story.user.id = User.user.id
	 .then(story => {
	 console.log('\n\n====== find() from /getStory ======');
	 console.log(story[0].user.lastName);
	 });*/
});


// Show Single Story
router.get('/show/:id', (req, res) => {
	Story.findOne({
		_id: req.params.id
	})
	.populate('user')
	.populate('comments.commentUser')
	.then(story => {
		if(story.status === 'public') {
			res.render('stories/show', {
				story: hbsSecurity.hbsFix(story)
			});
		} else {
			if(req.user) {		// check if user is logged in
				if(req.user.id === story.user._id) {
					res.render('stories/show', {
						story: hbsSecurity.hbsFix(story)
					});
				} else {
					res.redirect('/stories');
				}
			} else {
				res.redirect('/stories');
			}
		}
	});
});

// Edit Story Form
/*router.get('/edit/:id', ensureAuthenticated, (req, res) =>{
 Story.findOne({
 _id: req.params.id
 })
 .then(story =>{
 if(story.user != req.user.id) {
 res.redirect('/stories');
 } else {
 res.render('stories/edit', {
 story: story
 });
 }
 });
 });*/

/*
 // Stories Index
 router.get('/', (req, res) =>{
 Story.find({status: 'public'})
 .populate('user') // select Story.*, User.* from Story, User where Story.user.id = User.user.id
 .then(stories =>{
 res.render('stories/index', {
 stories: stories
 });
 });
 });
 
 // Add Story Form
 router.get('/add', ensureAuthenticated, (req, res) =>{
 res.render('stories/add');
 });
 
 // Process Add Story
 router.post('/', (req, res) =>{
 let allowComments;
 
 if(req.body.allowComments) {
 allowComments = true;
 } else {
 allowComments = false;
 }
 
 const newStory = {
 title: req.body.title,
 body: req.body.body,
 status: req.body.status,
 allowComments: allowComments,
 user: req.user.id
 };
 
 // Create Story
 new Story(newStory)
 .save()
 .then(story =>{
 res.redirect(`/stories/show/${story.id}`);
 });
 });
 */

//Updates chart according to date specified
router.get('/chart/update/:recordID', ensureAuthenticated, (req, res) => {
	var fromDate = req.query.fromDate;
	var today = new Date();
	var dd = String(today.getDate()).padStart(2, '0');
	var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
	var yyyy = today.getFullYear();
	var today = yyyy + '-' + mm + '-' + dd;

	//Check for fromDate value
	if (req.query.fromDate == "" || req.query.fromDate == null) {
		var fromDate = req.query.fromDate;
	} else {
		var fromDate = moment(req.query.fromDate, 'DD/MM/YYYY').format('YYYY-MM-DD');
	}

	//Check for toDate value
	if (req.query.toDate == "" || req.query.toDate == null) {
		var toDate = today;
	} else {
		var toDate = moment(req.query.toDate, 'DD/MM/YYYY').format('YYYY-MM-DD');
	}

	MasterVital.find({ date: { $gte: fromDate, $lte: toDate }, patientID: req.params.recordID }, {datetime: 1, temp: 1, sbp: 1, dbp: 1, resp: 1, heartRate: 1,  _id: 0})
		.sort({"datetime": 1}).then(vitalInfo => {
			MasterPain.find({ date: { $gte: fromDate, $lte: toDate }, patientID: req.params.recordID }, {datetime: 1, painScore: 1, _id: 0})
				.sort({"datetime": 1}).then(painInfo => {
					MasterOxygen.find({ date: { $gte: fromDate, $lte: toDate }, patientID: req.params.recordID }, {datetime: 1, spo2: 1, _id: 0})
						.sort({"datetime": 1}).then(o2Info => {
						res.send(
							{vital: vitalInfo, 
								pain: painInfo,
								oxygen: o2Info
							});
			})
		})
	})
})

//View chart (temperature, heart rate/oxygen, and blood pressure only for now)
router.get('/chart/:recordID', ensureAuthenticated, (req, res) => {
	userType = req.user.userType == 'student';
	var today = new Date();
	var dd = String(today.getDate()).padStart(2, '0');
	var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
	var yyyy = today.getFullYear();
	var today = yyyy + '-' + mm + '-' + dd;
	
	MasterVital.find({ date: { $gte: "", $lte: today }, patientID: req.params.recordID })
		.sort({"datetime": 1}).then(info => {
			MasterPain.find({ date: {$gte: "", $lte: today }, patientID: req.params.recordID })
			.sort({"datetime": 1}).then(painInfo => {
				MasterOxygen.find({date: { $gte: "", $lte: today }, patientID: req.params.recordID })
				.sort({"datetime": 1}).then(oxyInfo => {
					res.render('charts/master/charts', {
						recordID: req.params.recordID,
						userType: userType,
						oxyVal: hbsSecurity.hbsFixArr(oxyInfo),
						painVal: hbsSecurity.hbsFixArr(painInfo),
						chartVal: hbsSecurity.hbsFixArr(info),
						patient: req.session.patient,
						showMenu: true
				})
			});
		})
	})
})

 //Vital chart information
 router.get('/vital/:recordID', ensureAuthenticated, (req, res) => {
	userType = req.user.userType == 'student';
		MasterVital.find({ patientID: req.params.recordID }).sort({'datetime':1}).then(vitalData => {
			MasterPain.find({ patientID: req.params.recordID}).sort({'datetime':1}).then(painData => {
				MasterOxygen.find({ patientID: req.params.recordID }).sort({'datetime':1}).then(oxyData => {
					MasterWH.find({ patientID: req.params.recordID }).sort({'datetime':1}).then(whData => {

					sample = [];
					sampleDate = [];
					let vitalFlow = Object.assign([], vitalData);
					let painFlow = Object.assign([], painData);
					let oxyFlow = Object.assign([], oxyData);
					let whFlow = Object.assign([], whData);
					vitalCount = -1;
					painCount = -1;
					oxyCount = -1;
					whCount = 0;
					colCount = 0;
					
					noRecord = 'No existing record';

					vitalData.forEach(vital => {
						if (!(sample.includes(vital.datetime))) {
							sample.push(vital.datetime);
							sampleDate.push(vital.date);
						}
					});
					
					painData.forEach(pain => {
						if (!(sample.includes(pain.datetime))) {
							sample.push(pain.datetime);
							sampleDate.push(pain.date);
						}
					});
	
					oxyData.forEach(oxy => {
						if (!(sample.includes(oxy.datetime))) {
							sample.push(oxy.datetime);
							sampleDate.push(oxy.date);
						}
					});

					// whData.forEach(wh => {
					// 	if (!(sample.includes(wh.datetime))) {
					// 		sample.push(wh.datetime);
					// 		sampleDate.push(wh.date);
					// 	}
					// })

					sample.sort();
					sampleDate.sort();

					for (i = 0; i < sample.length; i++) {
	
						//Counter for empty data
						//.length here refers to last index of the array
						if (vitalCount !== (vitalFlow.length - 1)) {
							vitalCount++;
						}
						if (painCount !== (painFlow.length - 1)) {
							painCount++;
						}
						if (oxyCount !== (oxyFlow.length - 1)) {
							oxyCount++;
						}
	
						//Insert empty data when value doesnt match
						//Count here does the index count of flow array
						if (vitalFlow != '') {
							if (sample[i] < vitalFlow[vitalCount].datetime) {
								vitalFlow.splice(vitalCount, 0, {datetime: ''});
							} else if (sample[i] > vitalFlow[vitalCount].datetime) {
								vitalFlow.splice(vitalCount + 1, 0, {datetime: ''});
							}
						} else {
							vitalFlow.push({datetime: '', bPressure: noRecord});
						}
						
						if (painFlow != '') {
							if (sample[i] < painFlow[painCount].datetime) {
								painFlow.splice(painCount, 0, {datetime: ''});
							} else if (sample[i] > painFlow[painCount].datetime) {
								painFlow.splice(painCount + 1, 0, {datetime: ''});
							}
						} else {
							painFlow.push({datetime: '', characteristics: noRecord});
						}
	
						if (oxyFlow != '') {
							if (sample[i] < oxyFlow[oxyCount].datetime) {
								oxyFlow.splice(oxyCount, 0, {datetime: ''});
							} else if (sample[i] > oxyFlow[oxyCount].datetime) {
								oxyFlow.splice(oxyCount + 1, 0, {datetime: ''});
							}
						} else {
							oxyFlow.push({datetime: '', o2Amt: noRecord});
						}

						if (whFlow != '') {

							//Does the colspan counter for weight and height
							if (sampleDate[i] != whFlow[whCount].date) {	//If dont match
								colCount++;
								if (whFlow[whCount].date != '') {	//If current index is not empty
									whFlow.splice(whCount, 0, {date: ''});	//Adds empty date in current index
									// console.log('1', sampleDate[i+1], whFlow[whCount]);
									if (sampleDate[i+1] == whFlow[whCount + 1].date) { //If the next index matches the next i
										whCount++;
										colCount--;
									}
								} else if (whFlow[whCount + 1] == null) {	//So it doesn't give an error when it's null
								console.log('ensures that no error happens when whCount+1 is null');
							}
							else if (sampleDate[i+1] == whFlow[whCount + 1].date) {	//If the next index matches next i
								whFlow[whCount].colspan = colCount//Inserts colspan in current index
								whCount++;	//Moves to the next index
								colCount = 0;	//Resets column count to 0
							}
						} else { //If current whcount matches current i
							colCount++;	//Adds column count by 1
							if (sampleDate[i+1] != whFlow[whCount].date) {	//If the next index does not match current i
								whFlow[whCount].colspan = colCount;	//Inserts colspan in current index
								whCount++;	//Moves to the next index
								colCount = 0;	//Resets column count to 0 
								if (whFlow[whCount] == null) {	//If the current index is null
									whFlow.splice(whCount, 0, {date: ''});	//Adds empty date when it is null
								}
							}
						}
						whFlow[whCount].colspan = colCount;
						} else {
							whFlow.push({date: '', heightEst: noRecord});
						}
					};
					userType = req.user.userType == 'student';
					if (req.user.userType == 'staff')
					{
						userType = 'student';
					}

					res.render('charts/master/charts-vital', {
						recordID: req.params.recordID,
						userType: userType,
						dateVal: sample,
						vitalFlow:  hbsSecurity.hbsFixArr(vitalFlow),
						painFlow:  hbsSecurity.hbsFixArr(painFlow),
						oxyFlow:  hbsSecurity.hbsFixArr(oxyFlow),
						whFlow:  hbsSecurity.hbsFixArr(whFlow),
						newVital: hbsSecurity.hbsFixArr(vitalData),
						painData: hbsSecurity.hbsFixArr(painData),
						oxyData: hbsSecurity.hbsFixArr(oxyData),
						whData: hbsSecurity.hbsFixArr(whData),
						patient: req.session.patient,
						studentFirstName: req.session.firstNameAndEmail, // firstName + email
						currentUserType: req.user.userType,
						showMenu: true
					})
				})
			})
		});
	})
})

//Get single vital information
router.get('/vital/:recordID/:vitalID', ensureAuthenticated, (req, res) => {
	userType = req.user.userType == 'student';

	// MasterVital.find({ patientID: req.session.patient.patientID }).sort({'datetime':1}).then(newVital => {
	MasterVital.find({ patientID: req.params.recordID}).sort({'datetime':1}).then(newVital => {
		MasterVital.findOne({ vitalID: req.params.vitalID }).then(editVital => {

			//Changes date format to DD/MM/YYYY
			editVital.date = moment(editVital.date, 'YYYY-MM-DD').format('DD/MM/YYYY');
			res.render('charts/master/charts-vital', {
				recordID: req.params.recordID,
				userType: userType,
				newVital:  hbsSecurity.hbsFixArr(newVital),
				editVital:  hbsSecurity.hbsFix(editVital),
				patient: req.session.patient,
				showMenu: true
			})
		})
	})
})

//Delete vital information
router.delete('/del-vitals/:recordID/:vitalID', ensureAuthenticated, (req, res) => {
	MasterVital.deleteOne({vitalID: req.params.vitalID}, function(err) {
		if (err) {
			console.log('cannot delete vitals');
		}
	});
	res.redirect('/student/vital/'+req.params.recordID);
})

//Edit vital information
router.put('/edit-vital/:recordID/:vitalID', ensureAuthenticated, (req,res) => {
	datetime = moment(req.body.dateVital, 'DD/MM/YYYY').format('MM/DD/YYYY') + " " + req.body.timeVital;
	bPressure = req.body.sbp + "/" + req.body.dbp;
	abPressure = req.body.sbpArterial + "/" + req.body.dbpArterial;

	MasterVital.findOne({ vitalID: req.params.vitalID }).then(editVital => {
		editVital.date = moment(req.body.dateVital, 'DD/MM/YYYY').format('YYYY-MM-DD'),
		editVital.time = req.body.timeVital,
		editVital.datetime = datetime,
		editVital.temp = req.body.temp,
		editVital.tempRoute = req.body.tempRoute,
		editVital.heartRate = req.body.heartRate,
		editVital.resp = req.body.resp,
		editVital.sbp = req.body.sbp,
		editVital.dbp = req.body.dbp,
		editVital.sbpArterial = req.body.sbpArterial,
		editVital.dbpArterial = req.body.dbpArterial,
		editVital.bPressure = bPressure,
		editVital.arterialBP = abPressure,
		editVital.bpLocation = req.body.bpLocation,
		editVital.bpMethod = req.body.bpMethod,
		editVital.patientPosition = req.body.patientPosition

		editVital.save();
	});
	res.redirect('/student/vital/' + req.params.recordID);
})

// post vital
router.post('/add-vital/:recordID', ensureAuthenticated, (req, res) => {
	vitalid = (new standardID('AAA0000')).generate();
	datetime = moment(req.body.dateVital, 'DD/MM/YYYY').format('MM/DD/YYYY') + " " + req.body.timeVital;
	bPressure = req.body.sbp + "/" + req.body.dbp;
	abPressure = req.body.sbpArterial + "/" + req.body.dbpArterial;

	new MasterVital({
		// patientID: req.session.patient.patientID,
		patientID: req.params.recordID,
		vitalID: vitalid,
		userID: req.user.id,
		date: moment(req.body.dateVital, 'DD/MM/YYYY').format('YYYY-MM-DD'),
		time: req.body.timeVital,
		datetime: datetime,
		temp: req.body.temp,
		tempRoute: req.body.tempRoute,
		heartRate: req.body.heartRate,
		resp: req.body.resp,
		sbp: req.body.sbp,
		dbp: req.body.dbp,
		sbpArterial: req.body.sbpArterial,
		dbpArterial: req.body.dbpArterial,
		bPressure: bPressure,
		arterialBP: abPressure,
		bpLocation: req.body.bpLocation,
		bpMethod: req.body.bpMethod,
		patientPosition: req.body.patientPosition,
		userType: req.user.userType
	}).save();

	res.redirect('/student/vital/'+ req.params.recordID);
})

// add pain
router.post('/add-pain/:recordID', ensureAuthenticated, (req, res) => {
	painid = (new standardID('AAA0000')).generate();
	datetime = moment(req.body.datePain, 'DD/MM/YYYY').format('MM/DD/YYYY') + " " + req.body.timePain;

	new MasterPain({
		// patientID: req.session.patient.patientID,
		patientID: req.params.recordID,
		painID: painid,
		userType: req.user.userType,
		datetime: datetime,
		date: moment(req.body.datePain, 'DD/MM/YYYY').format('YYYY-MM-DD'),
		time: req.body.timePain,
		painScale: req.body.painScale,
		painScore: req.body.painScore,
		onset: req.body.onset,
		location: req.body.location,
		duration: req.body.duration,
		characteristics: req.body.characteristics,
		associatedSymp: req.body.associatedSymp,
		aggravatingFact: req.body.aggravatingFact,
		relievingFact: req.body.relievingFact,
		painIntervene: req.body.painIntervene,
		responseIntervene: req.body.responseIntervene,
		siteofpain : req.body.siteofpain
	}).save();

	res.redirect('/student/vital/'+ req.params.recordID);

})

//Delete pain info
router.delete('/del-pain/:recordID/:painID', ensureAuthenticated, (req, res) => {
	MasterPain.deleteOne({ painID: req.params.painID }, function(err) {
		if(err) {
			console.log('cannot delete pain info');
		}
	})
	res.redirect('/student/vital/'+ req.params.recordID);
})

//Get single pain info
router.get('/pain/:recordID/:painID', ensureAuthenticated, (req, res) => {
	userType = req.user.userType == 'student';
	// MasterPain.find({ patientID: req.session.patient.patientID }).sort({'datetime':1}).then(painData => {
	MasterPain.find({ patientID: req.params.recordID }).sort({'datetime':1}).then(painData => {
		MasterPain.findOne({ painID: req.params.painID }).then(editPain => {

			//Changes date format to DD/MM/YYYY
			editPain.date = moment(editPain.date, 'YYYY-MM-DD').format('DD/MM/YYYY');
			res.render('charts/master/charts-vital', {
				recordID: req.params.recordID,
				userType: userType,
				painData:  hbsSecurity.hbsFixArr(painData),
				editPain:  hbsSecurity.hbsFix(editPain),
				patient: req.session.patient,
				showMenu: true
			})
		})
	})
})
//Edit pain info
router.put('/edit-pain/:recordID/:painID', ensureAuthenticated, (req, res) => {
	datetime = moment(req.body.datePain, 'DD/MM/YYYY').format('MM/DD/YYYY') + " " + req.body.timePain;

	MasterPain.findOne({ painID: req.params.painID }).then(editPain => {
		editPain.datetime = datetime,
		editPain.date = moment(req.body.datePain, 'DD/MM/YYYY').format('YYYY-MM-DD'),
		editPain.time = req.body.timePain,
		editPain.painScale = req.body.painScale,
		editPain.painScore = req.body.painScore,
		editPain.onset = req.body.onset,
		editPain.location = req.body.location,
		editPain.duration = req.body.duration,
		editPain.characteristics = req.body.characteristics,
		editPain.associatedSymp = req.body.associatedSymp,
		editPain.aggravatingFact = req.body.aggravatingFact,
		editPain.relievingFact = req.body.relievingFact,
		editPain.painIntervene = req.body.painIntervene,
		editPain.responseIntervene = req.body.responseIntervene,
		editPain.siteofpain = req.body.siteofpain

		editPain.save();
	})
	res.redirect('/student/vital/' + req.params.recordID);
})

//Get single oxygen information
router.get('/oxygen/:recordID/:oxygenID', ensureAuthenticated, (req, res) => {
	userType = req.user.userType == 'student';
	// MasterOxygen.find({ patientID: req.session.patient.patientID }).sort({'datetime':1}).then(oxyData => {
	MasterOxygen.find({ patientID: req.params.recordID }).sort({'datetime':1}).then(oxyData => {
		MasterOxygen.findOne({ oxygenID: req.params.oxygenID }).then(editOxy => {

			//Changes date format to DD/MM/YYYY
			editOxy.date = moment(editOxy.date, 'YYYY-MM-DD').format('DD/MM/YYYY');
			res.render('charts/master/charts-vital', {
				recordID: req.params.recordID,
				userType: userType,
				oxyData:  hbsSecurity.hbsFixArr(oxyData),
				editOxy:  hbsSecurity.hbsFix(editOxy),
				patient: req.session.patient,
				showMenu: true
			})
		})
	})
})

//Add oxygen information
router.post('/add-oxygen/:recordID', ensureAuthenticated, (req, res) => {
	oxygenid = (new standardID('AAA0000')).generate();
	datetime = moment(req.body.dateOxy, 'DD/MM/YYYY').format('MM/DD/YYYY') + " " + req.body.timeOxy;

	new MasterOxygen({
		// patientID: req.session.patient.patientID,
		patientID: req.params.recordID,
		oxygenID: oxygenid,
		userType: req.user.userType,
		datetime: datetime,
		date: moment(req.body.dateOxy, 'DD/MM/YYYY').format('YYYY-MM-DD'),
		time: req.body.timeOxy,
		o2Device: req.body.oxyDevice,
		humidifier: req.body.humidifier,
		o2Amt: req.body.oxyAmt,
		fio2: req.body.fiOxy,
		spo2: req.body.spOxy
	}).save();

	res.redirect('/student/vital/'+ req.params.recordID);
})

//Update oxygen information
router.put('/edit-oxygen/:recordID/:oxygenID', ensureAuthenticated, (req, res) => {
	datetime = moment(req.body.dateOxy, 'DD/MM/YYYY').format('MM/DD/YYYY') + " " + req.body.timeOxy;

	MasterOxygen.findOne({ oxygenID: req.params.oxygenID }).then(editOxy => {
		editOxy.datetime = datetime,
		editOxy.date = moment(req.body.dateOxy, 'DD/MM/YYYY').format('YYYY-MM-DD'),
		editOxy.time = req.body.timeOxy,
		editOxy.o2Device = req.body.oxyDevice,
		editOxy.humidifier = req.body.humidifier,
		editOxy.o2Amt = req.body.oxyAmt,
		editOxy.fio2 = req.body.fiOxy,
		editOxy.spo2 = req.body.spOxy

		editOxy.save();
	})
	res.redirect('/student/vital/' + req.params.recordID);
})

//Delete oxygen information
router.delete('/del-oxygen/:recordID/:oxygenID', ensureAuthenticated, (req, res) => {
	MasterOxygen.deleteOne({ oxygenID: req.params.oxygenID }, function(err) {
		if(err) {
			console.log('cannot delete oxygen information');
		}
	});
	res.redirect('/student/vital/'+ req.params.recordID);
})

//Get single weight & height information
router.get('/wh/:recordID/:whID', ensureAuthenticated, (req, res) => {
	userType = req.user.userType == 'student';
	// MasterWH.find({ patientID: req.session.patient.patientID }).sort({'datetime':1}).then(whData => {
	MasterWH.find({ patientID: req.params.recordID }).sort({'datetime':1}).then(whData => {
		MasterWH.findOne({ whID: req.params.whID }).then(editWh => {

			//Changes date format to DD/MM/YYYY
			editWh.date = moment(editWh.date, 'YYYY-MM-DD').format('DD/MM/YYYY');
			res.render('charts/master/charts-vital', {
				recordID: req.params.recordID,
				userType: userType,
				whData:  hbsSecurity.hbsFixArr(whData),
				editWh:  hbsSecurity.hbsFix(editWh),
				patient: req.session.patient,
				showMenu: true
			})
		})
	})
})

//Add weight & height information
router.post('/add-wh/:recordID', ensureAuthenticated, (req, res) => {
	whid = (new standardID('AAA0000')).generate();
	datetime = moment(req.body.dateWh, 'DD/MM/YYYY').format('MM/DD/YYYY') + " " + req.body.timeWh;

	new MasterWH({
		// patientID: req.session.patient.patientID,
		patientID: req.params.recordID,
		whID: whid,
		userType: req.user.userType,
		datetime: datetime,
		date: moment(req.body.dateWh, 'DD/MM/YYYY').format('YYYY-MM-DD'),
		time: req.body.timeWh,
		height: req.body.height,
		heightEst: req.body.heightEst,
		weight: req.body.weight,
		weightEst: req.body.weightEst,
		bsa: req.body.bsa,
		bmi: req.body.bmi
	}).save();

	res.redirect('/student/vital/'+req.params.recordID);
})

//Edit weight & height information
router.put('/edit-wh/:recordID/:whID', ensureAuthenticated, (req, res) => {
	datetime = moment(req.body.dateWh, 'DD/MM/YYYY').format('MM/DD/YYYY') + " " + req.body.timeWh;

	MasterWH.findOne({ whID: req.params.whID }).then(editWH => {
		editWH.datetime = datetime,
		editWH.date = moment(req.body.dateWh, 'DD/MM/YYYY').format('YYYY-MM-DD'),
		editWH.time = req.body.timeWh,
		editWH.height = req.body.height,
		editWH.heightEst = req.body.heightEst,
		editWH.weight = req.body.weight,
		editWH.weightEst = req.body.weightEst,
		editWH.bsa = req.body.bsa,
		editWH.bmi = req.body.bmi

		editWH.save();
	})
	res.redirect('/student/vital/' + req.params.recordID);
})
//Delete weight & height information
router.delete('/del-wh/:recordID/:whID', ensureAuthenticated, (req, res) => {
	MasterWH.deleteOne({ whID: req.params.whID }, function(err) {
		if (err) {
			console.log('cannot delete weight & height information');
		}
	})
	res.redirect('/student/vital/' + req.params.recordID);
})

//Starting route for doctor's orders
router.get('/doctor/orders/:recordID', ensureAuthenticated, (req, res) => {
	userType = req.user.userType == 'student';
	if (req.user.userType == 'staff')
	{
		userType = 'student';
	}

	//DoctorOrders.find({ patientID: req.params.recordID }).sort({'datetime':1}).then(docOrders => {
	DoctorOrders.find({ patientID: req.session.patient.patientID }).sort({'datetime':1}).then(docOrders => {
		res.render('doctors/doctors-orders', {
			recordID: req.params.recordID,
			userType: userType,
			docOrders:  hbsSecurity.hbsFixArr(docOrders),
			patient: req.session.patient,
			currentUserType: req.user.userType,
			studentFirstName: req.session.firstNameAndEmail,
			showMenu: true
		})
	})
})

//Get single doctor's orders
router.get('/doctor/orders/:recordID/:orderID', ensureAuthenticated, (req, res) => {
	userType = req.user.userType == 'student';
	if (req.user.userType == 'staff')
	{
		userType = 'student';
	}
	//DoctorOrders.find({ patientID: req.params.recordID }).sort({'datetime':1}).then(docOrders => {
	DoctorOrders.find({ patientID: req.session.patient.patientID }).sort({'datetime':1}).then(docOrders => {
		DoctorOrders.findOne({ orderID: req.params.orderID }).then(editOrder => {

			editOrder.date = moment(editOrder.date, 'YYYY-MM-DD').format('DD/MM/YYYY');
			res.render('doctors/doctors-orders', {
				recordID: req.params.recordID,
				userType: userType,
				docOrders:  hbsSecurity.hbsFixArr(docOrders),
				editOrder:  hbsSecurity.hbsFix(editOrder),
				patient: req.session.patient,
				showMenu: true
			})
		})
	})
})

//Load IO page
router.get('/io/:recordID', ensureAuthenticated, (req, res) => {
	userType = req.user.userType == 'student';
	// MasterIO.find({ patientID: req.session.patient.patientID }).sort({'datetime':1}).then(newIO => {
	// 	MasterEnteral.find({ patientID: req.session.patient.patientID }).sort({'datetime':1}).then(newenteral => {
	// 		MasterIV.find({ patientID: req.session.patient.patientID }).sort({'datetime':1}).then(newiv => {	
	// 			MasterOutput.find({ patientID: req.session.patient.patientID }).sort({'datetime':1}).then(newoutput => {
		MasterIO.find({patientID: req.params.recordID}).sort({'datetime':1}).then(newIO => {
			MasterEnteral.find({ patientID: req.params.recordID }).sort({'datetime':1}).then(newenteral => {
				MasterIV.find({ patientID: req.params.recordID }).sort({'datetime':1}).then(newiv => {	
					MasterOutput.find({ patientID: req.params.recordID }).sort({'datetime':1}).then(newoutput => {						

					iosample = [];
					iosampleDate = [];
					let ioFlow = Object.assign([], newIO);
					let enteralFlow = Object.assign([], newenteral);
					let ivFlow = Object.assign([], newiv);
					let outputFlow = Object.assign([], newoutput);
					ioCount = -1;
					enteralCount = -1;
					ivCount = -1;
					outputCount = -1;
					ionoRecord = 'No existing record';

					newIO.forEach(io => {
						if (!(iosample.includes(io.datetime))) {
							iosample.push(io.datetime);
							iosampleDate.push(io.date);
						}
					});

					newenteral.forEach(enteral => {
						if (!(iosample.includes(enteral.datetime))){
							iosample.push(enteral.datetime);
							iosampleDate.push(enteral.date);
						}
					});

					newiv.forEach(iv => {
						if (!(iosample.includes(iv.datetime))) {
							iosample.push(iv.datetime);
							iosampleDate.push(iv.date);
						}
					});

					newoutput.forEach(output => {
						if (!(iosample.includes(output.datetime))) {
							iosample.push(output.datetime);
							iosampleDate.push(output.date);
						}
					});
		
						
					iosample.sort();
					iosampleDate.sort();

					for (i = 0; i < iosample.length; i++) {
						

						//Counter for empty data
						//.length here refers to last index of the array
						if (ioCount !== (ioFlow.length - 1)) {
							ioCount++;
						}

						if (enteralCount !== (enteralFlow.length - 1)) {
							enteralCount++;
						}

						if (ivCount !== (ivFlow.length - 1)) {
							ivCount++;
						}

						if (outputCount !== (outputFlow.length - 1)) {
							outputCount++;
						}
						

						//Insert empty data when value doesnt match
						//Count here does the index count of flow array
						if(ioFlow !='') 
						{
							if (iosample[i] < ioFlow[ioCount].datetime) {
								ioFlow.splice(ioCount, 0, {datetime: ''});
							} else if (iosample[i] > ioFlow[ioCount].datetime) {
								ioFlow.splice(ioCount + 1, 0, {datetime: ''});
							}
						} 
						else
						{
							ioFlow.push({datetime: '', intakefood: ionoRecord});
						}

						if(enteralFlow !='') 
						{
							if (iosample[i] < enteralFlow[enteralCount].datetime) {
								enteralFlow.splice(enteralCount, 0, {datetime: ''});
							} else if (iosample[i] > enteralFlow[enteralCount].datetime) {
								enteralFlow.splice(enteralCount + 1, 0, {datetime: ''});
							}
						} 
						else
						{
							enteralFlow.push({datetime: '', enteralfeed: ionoRecord});
						}

						if(ivFlow !='') 
						{
							if (iosample[i] < ivFlow[ivCount].datetime) {
								ivFlow.splice(ivCount, 0, {datetime: ''});
							} else if (iosample[i] > ivFlow[ivCount].datetime) {
								ivFlow.splice(ivCount + 1, 0, {datetime: ''});
							}
						} 
						else 
						{
							ivFlow.push({datetime: '', ivflush: ionoRecord});
						}

						if(outputFlow !='')
						{
							if (iosample[i] < outputFlow[outputCount].datetime) {
								outputFlow.splice(outputCount, 0, {datetime: ''});
							} else if (iosample[i] > outputFlow[outputCount].datetime) {
								outputFlow.splice(outputCount + 1, 0, {datetime: ''});
							}
						}
						else 
						{
							outputFlow.push({datetime: '', otherass: ionoRecord});
						}
					};

					//DAILY NETT BALANCE
					let dateArr = [];
					let ArrayObj = [];

					newIO.forEach(io => {
						if(!(dateArr.includes(io.date))) {
							dateArr.push(io.date);
						}
					});

					newenteral.forEach(enteral => {
						if(!(dateArr.includes(enteral.date))) {
							dateArr.push(enteral.date);
						}
					});
					
					newiv.forEach(iv => {
						if(!(dateArr.includes(iv.date))) {
							dateArr.push(iv.date);
						}
					});

					newoutput.forEach(output => {
						if(!(dateArr.includes(output.date))) {
							dateArr.push(output.date);
						}
					});

					console.log(dateArr);

					newIO.forEach(io => {
						ArrayObj.push({
							date: io.date,
							balance: parseFloat(io.fluidportion)
						});
					});

					newenteral.forEach(enteral => {
						ArrayObj.push({
							date: enteral.date,
							balance: parseFloat(enteral.feedamt) + parseFloat(enteral.flush)
						});
					});

					newiv.forEach(iv => {
						ArrayObj.push({
							date: iv.date,
							balance: parseFloat(iv.conamt) + parseFloat(iv.amtinf) + parseFloat(iv.ivflush)
						});
					});

					var resultArr = createObject(ArrayObj);

					newoutput.forEach(output => {
					 	resultArr.push({
					 		date: output.date,
					 		balance: parseFloat(output.urineamt) + parseFloat(output.vomitamt) + parseFloat(output.bloodamt) + parseFloat(output.diaper) + parseFloat(output.otheramt)
					 	});
					});

					//console.log(resultArr);

					function createObject(newObj) {
						var o = {}
						var result = newObj.reduce(function(r, e) {
						var key = e.date
						if (!o[key]) {
							o[key] = e;
							r.push(o[key]);
						} else {
							o[key].balance += e.balance;
						}
						return r;
						}, []);
						return result;
					};


					function subtractOutput(newObj) {
						var o = {}
						var result = newObj.reduce(function(r, e) {
						var key = e.date
						if (!o[key]) {
							o[key] = e;
							r.push(o[key]);
						} else {
							o[key].balance -= e.balance;
						}
						return r;
						}, []);
						return result;
					};

					var finalArr = subtractOutput(resultArr);

					console.log(finalArr);

					userType = req.user.userType == 'student';
					if (req.user.userType == 'staff')
					{
						userType = 'student';
					}
					res.render('charts/master/charts-io', {
						recordID: req.params.recordID,
						userType: userType,
						iodateVal: iosample,
						dailyBalance: finalArr,
						ioFlow: hbsSecurity.hbsFixArr(ioFlow),
						enteralFlow: hbsSecurity.hbsFixArr(enteralFlow),
						ivFlow: hbsSecurity.hbsFixArr(ivFlow),
						outputFlow:hbsSecurity.hbsFixArr(outputFlow),
						newIO: hbsSecurity.hbsFixArr(newIO),
						newenteral: hbsSecurity.hbsFixArr(newenteral),
						newiv: hbsSecurity.hbsFixArr(newiv),
						newoutput: hbsSecurity.hbsFixArr(newoutput),
						patient: req.session.patient,
						currentUserType: req.user.userType,
						studentFirstName: req.session.firstNameAndEmail,
						showMenu: true
					})
				})
			})
		});
	})
})

//get single io info
router.get('/io/:recordID/:ioID', ensureAuthenticated, (req, res) => {
	userType = req.user.userType == 'student';
	MasterIO.find({ patientID: req.params.recordID }).sort({'datetime':1}).then(newIO => {
		MasterIO.findOne({ ioID: req.params.ioID }).then(editIO => {

			editIO.date = moment(editIO.date, 'YYYY-MM-DD').format('DD/MM/YYYY');
			res.render('charts/master/charts-io', {
				recordID: req.params.recordID,
				userType: userType,
				newIO: hbsSecurity.hbsFixArr(newIO),
				editIO: hbsSecurity.hbsFix(editIO),
				patient: req.session.patient,
				showMenu: true			
			})
		})
	})
})
//add io info
router.post('/add-io/:recordID', ensureAuthenticated, (req, res) => {
	ioID = (new standardID('AAA0000')).generate();
	datetime = moment(req.body.dateIO, 'DD/MM/YYYY').format('MM/DD/YYYY') + " " + req.body.timeIO;
	
	new MasterIO({
		// patientID: req.session.patient.patientID,
		patientID: req.params.recordID,
		ioID: ioID,
		date:	moment(req.body.dateIO, 'DD/MM/YYYY').format('YYYY-MM-DD'),
		time: req.body.timeIO,
		datetime: datetime,
		intakefood: req.body.intakefood,
		foodtype: req.body.foodtype,
		foodportion: req.body.foodportion,
		fluidtype: req.body.fluidtype,
		fluidportion: req.body.fluidportion,

	}).save();

	res.redirect('/student/io/'+req.params.recordID);
})
//edit IO informations
router.put('/edit-io/:recordID/:ioID', ensureAuthenticated, (req,res) => {
	datetime = moment(req.body.dateIO, 'DD/MM/YYYY').format('MM/DD/YYYY') + " " + req.body.timeIO;


	MasterIO.findOne({ ioID: req.params.ioID }).then(editIO => {
		editIO.date = moment(req.body.dateIO, 'DD/MM/YYYY').format('YYYY-MM-DD'),
		editIO.time = req.body.timeIO,
		editIO.datetime = datetime,
		editIO.intakefood = req.body.intakefood,
		editIO.foodtype = req.body.foodtype,
		editIO.foodportion = req.body.foodportion,
		editIO.fluidtype = req.body.fluidtype,
		editIO.fluidportion = req.body.fluidportion,

		editIO.save();
	});
	res.redirect('/student/io/' + req.params.recordID);
})
//Delete IO information
router.delete('/del-io/:recordID/:ioID', ensureAuthenticated, (req, res) => {
	MasterIO.deleteOne({ioID: req.params.ioID}, function(err) {
		if (err) {
			console.log('Cannot delete IO details');
		}
	});
	res.redirect('/student/io/' + req.params.recordID);
})

//add enteral info
router.post('/add-enteral/:recordID', ensureAuthenticated, (req, res) => {
	enteralID = (new standardID('AAA0000')).generate();
	datetime = moment(req.body.dateenteral, 'DD/MM/YYYY').format('MM/DD/YYYY') + " " + req.body.timeenteral;


	new MasterEnteral({
		patientID: req.params.recordID,
		enteralID: enteralID,
		date: moment(req.body.dateenteral, 'DD/MM/YYYY').format('YYYY-MM-DD'),
		time: req.body.timeenteral,
		datetime: datetime,
		enteralfeed: req.body.enteralfeed,
		formula: req.body.formula,
		feedamt: req.body.feedamt,
		flush: req.body.flush,

	}).save();

	res.redirect('/student/io/' + req.params.recordID);
})

//Delete Enteral information
router.delete('/del-enteral/:recordID/:enteralID', ensureAuthenticated, (req, res) => {
	MasterEnteral.deleteOne({enteralID: req.params.enteralID}, function(err) {
		if (err) {
			console.log('cannot delete Enteral details');
		}
	});
	res.redirect('/student/io/' + req.params.recordID);
})

//Get single enteral info
router.get('/enteral/:recordID/:enteralID', ensureAuthenticated, (req, res) => {
	userType = req.user.userType == 'student';
	MasterEnteral.find({ patientID: req.session.patient.patientID }).sort({'datetime':1}).then(newenteral => {
		MasterEnteral.findOne({ enteralID: req.params.enteralID }).then(editenteral => {

			//Changes date format to DD/MM/YYYY
			editenteral.date = moment(editenteral.date, 'YYYY-MM-DD').format('DD/MM/YYYY');
			res.render('charts/master/charts-io', {
				recordID: req.params.recordID,
				userType: userType,
				newenteral: hbsSecurity.hbsFixArr(newenteral),
				editenteral: hbsSecurity.hbsFix(editenteral),
      		})
    	})
  	})
})


//Edit Enteral info
router.put('/edit-enteral/:recordID/:enteralID', ensureAuthenticated, (req, res) => {
	datetime = moment(req.body.dateenteral, 'DD/MM/YYYY').format('MM/DD/YYYY') + " " + req.body.timeenteral;

	MasterEnteral.findOne({ enteralID: req.params.enteralID }).then(editenteral => {
		editenteral.date = moment(req.body.dateenteral, 'DD/MM/YYYY').format('YYYY-MM-DD'),
		editenteral.time = req.body.timeenteral,
		editenteral.datetime = datetime,
		editenteral.enteralfeed = req.body.enteralfeed,
		editenteral.formula = req.body.formula,
		editenteral.feedamt = req.body.feedamt,
		editenteral.flush = req.body.flush,

		editenteral.save();
	})
	res.redirect('/student/io/' + req.params.recordID);
})

//add iv info
router.post('/add-iv/:recordID', ensureAuthenticated, (req, res) => {
	ivID = (new standardID('AAA0000')).generate();
	datetime = moment(req.body.dateiv, 'DD/MM/YYYY').format('MM/DD/YYYY') + " " + req.body.timeiv;


	new MasterIV({
		patientID: req.params.recordID,
		ivID: ivID,
		date: moment(req.body.dateiv, 'DD/MM/YYYY').format('YYYY-MM-DD'),
		time: req.body.timeiv,
		datetime: datetime,
		coninf: req.body.coninf,
		conamt: req.body.conamt,
		intinf: req.body.intinf,
		amtinf: req.body.amtinf,
		ivflush: req.body.ivflush,

	}).save();

	res.redirect('/student/io/' +req.params.recordID);
})
//Delete iv information
router.delete('/del-iv/:recordID/:ivID', ensureAuthenticated, (req, res) => {
	MasterIV.deleteOne({ivID: req.params.ivID}, function(err) {
		if (err) {
			console.log('cannot delete IV details');
		}
	});
	res.redirect('/student/io/' + req.params.recordID);
})
//Get single iv info
router.get('/iv/:recordID/:ivID', ensureAuthenticated, (req, res) => {
	userType = req.user.userType == 'student';
	MasterIV.find({ patientID: req.session.patient.patientID }).sort({'datetime':1}).then(newiv => {
		MasterIV.findOne({ ivID: req.params.ivID }).then(editiv => {

			//Changes date format to DD/MM/YYYY
			editiv.date = moment(editiv.date, 'YYYY-MM-DD').format('DD/MM/YYYY');
			res.render('charts/master/charts-io', {
				recordID: req.params.recordID,
				userType: userType,
				newiv: hbsSecurity.hbsFixArr(newiv),
				editiv: hbsSecurity.hbsFix(editiv),
      		})
    	})
  	})
})

//Edit IV info
router.put('/edit-iv/:recordID/:ivID', ensureAuthenticated, (req, res) => {
	datetime = moment(req.body.dateiv, 'DD/MM/YYYY').format('MM/DD/YYYY') + " " + req.body.timeiv;

	MasterIV.findOne({ ivID: req.params.ivID }).then(editiv => {

		editiv.datetime = datetime,
		editiv.date = moment(req.body.dateiv, 'DD/MM/YYYY').format('YYYY-MM-DD'),
		editiv.time = req.body.timeiv,
		editiv.coninf = req.body.coninf,
		editiv.conamt = req.body.conamt,
		editiv.intinf = req.body.intinf,
		editiv.amtinf = req.body.amtinf,
		editiv.ivflush = req.body.ivflush,


		editiv.save();
	})
	res.redirect('/student/io/' + req.params.recordID);
})

//add output info
router.post('/add-output/:recordID', ensureAuthenticated, (req, res) => {
	outputID = (new standardID('AAA0000')).generate();
	datetime = moment(req.body.dateoutput, 'DD/MM/YYYY').format('MM/DD/YYYY') + " " + req.body.timeoutput;


	new MasterOutput({
		patientID: req.params.recordID,
		outputID: outputID,
		date: moment(req.body.dateoutput, 'DD/MM/YYYY').format('YYYY-MM-DD'),
		time: req.body.timeoutput,
		datetime: datetime,
		urineamt: req.body.urineamt,
		urineass: req.body.urineass,
		stoolamt: req.body.stoolamt,
		stoolass: req.body.stoolass,
		vomitamt: req.body.vomitamt,
		vomitass: req.body.vomitass,
		bloodamt: req.body.bloodamt,
		diaper: req.body.diaper,
		otheramt: req.body.otheramt,
		otherass: req.body.otherass,

	}).save();

	res.redirect('/student/io/'+ req.params.recordID);
})
//Delete output information
router.delete('/del-output/:recordID/:outputID', ensureAuthenticated, (req, res) => {
	MasterOutput.deleteOne({outputID: req.params.outputID}, function(err) {
		if (err) {
			console.log('Cannot delete Output details');
		}
	});
	res.redirect('/student/io/' + req.params.recordID);
})

//Get single output info
router.get('/output/:recordID/:outputID', ensureAuthenticated, (req, res) => {
	userType = req.user.userType == 'student';
	MasterOutput.find({ patientID: req.session.patient.patientID }).sort({'datetime':1}).then(newoutput => {
		MasterOutput.findOne({ outputID: req.params.outputID }).then(editoutput => {

			//Changes date format to DD/MM/YYYY
			editoutput.date = moment(editoutput.date, 'YYYY-MM-DD').format('DD/MM/YYYY');
			res.render('charts/master/charts-io', {
				recordID: req.params.recordID,
				userType: userType,
				newoutput: hbsSecurity.hbsFixArr(newoutput),
				editoutput: hbsSecurity.hbsFix(editoutput),
				patient: req.session.patient,
				showMenu: true	
      		})
    	})
  	})
})

//Edit output info
router.put('/edit-output/:recordID/:outputID', ensureAuthenticated, (req, res) => {
	datetime = moment(req.body.dateoutput, 'DD/MM/YYYY').format('MM/DD/YYYY') + " " + req.body.timeoutput;

	MasterOutput.findOne({ outputID: req.params.outputID }).then(editoutput => {

		editoutput.date = moment(req.body.dateoutput, 'DD/MM/YYYY').format('YYYY-MM-DD'),
		editoutput.time = req.body.timeoutput,
		editoutput.datetime = datetime,
		editoutput.urineamt = req.body.urineamt,
		editoutput.urineass = req.body.urineass,
		editoutput.stoolamt = req.body.stoolamt,
		editoutput.stoolass = req.body.stoolass,
		editoutput.vomitamt = req.body.vomitamt,
		editoutput.vomitass = req.body.vomitass,
		editoutput.bloodamt = req.body.bloodamt,
		editoutput.diaper = req.body.diaper,
		editoutput.otheramt = req.body.otheramt,
		editoutput.otherass = req.body.otherass,


		editoutput.save();
	})
	res.redirect('/student/io/' + req.params.recordID);
})

//open route to braden page
router.get('/braden/:recordID', ensureAuthenticated, (req, res) => {
	userType = req.user.userType == 'student';
	// MasterBraden.find({ patientID: req.session.patient.patientID }).then(newBraden => {
		MasterBraden.find({ patientID: req.params.recordID }).then(newBraden => {
	
		//console.log(newBraden);
		userType = req.user.userType == 'student';
		if (req.user.userType == 'staff')
		{
			userType = 'student';
		}


		res.render('charts/master/charts-braden', {
			// azureId: req.user.azure_oid,
			recordID: req.params.recordID,
			userType: userType,
			newBraden: hbsSecurity.hbsFixArr(newBraden),
			patient: req.session.patient,
			currentUserType: req.user.userType,
			studentFirstName: req.session.firstNameAndEmail,
			showMenu: true
		})
  	})
})

//get single braden info
router.get('/braden/:recordID/:bradenID', ensureAuthenticated, (req, res) => {
	userType = req.user.userType == 'student';
	// MasterBraden.find({ patientID: req.session.patient.patientID }).then(newBraden => {
		MasterBraden.find({ patientID: req.params.recordID }).then(newBraden => {

		MasterBraden.findOne({ bradenID: req.params.bradenID }).then(editBraden => {
			res.render('charts/master/charts-braden', {
				// azureId: req.user.azure_oid,
				recordID: req.params.recordID,
				userType: userType,
				newBraden: hbsSecurity.hbsFixArr(newBraden),
				editBraden: hbsSecurity.hbsFix(editBraden),
				patient: req.session.patient,
				showMenu: true			
			})
		})
	})
})
//add braden info
router.post('/add-braden/:recordID', ensureAuthenticated, (req, res) => {
	bradenID = (new standardID('AAA0000')).generate();
	datetime = moment(req.body.dateBraden, 'DD/MM/YYYY').format('MM/DD/YYYY') + " ";

	total = parseInt(req.body.sensePerc.slice(-1)) 
	+ parseInt(req.body.moisture.slice(-1)) 
	+ parseInt(req.body.activity.slice(-1))
	+ parseInt(req.body.mobility.slice(-1)) 
	+ parseInt(req.body.nutrition.slice(-1)) 
	+ parseInt(req.body.fns.slice(-1));

	splitSensePerc = removeNumber.removeNumberFunction(req.body.sensePerc);
	splitMoisture = removeNumber.removeNumberFunction(req.body.moisture);
	splitActivity = removeNumber.removeNumberFunction(req.body.activity);
	splitMobility = removeNumber.removeNumberFunction(req.body.mobility);
	splitNutrition = removeNumber.removeNumberFunction(req.body.nutrition);
	splitFns = removeNumber.removeNumberFunction(req.body.fns);


	new MasterBraden({
			// patientID: req.session.patient.patientID,
			patientID: req.params.recordID,
			bradenID: bradenID,
			// by: req.user.azure_oid,
			date: req.body.dateBraden,
			datetime: datetime,
			sensePercSplit: splitSensePerc,
			moistureSplit: splitMoisture,
			activitySplit: splitActivity,
			mobilitySplit: splitMobility,
			nutritionSplit: splitNutrition,
			fnsSplit: splitFns,
			total: total,

			sensePerc: req.body.sensePerc,
			activity:	req.body.activity,
			moisture: req.body.moisture,
			mobility: req.body.mobility,
			nutrition: req.body.nutrition,
			fns: req.body.fns,


	}).save();

	res.redirect('/student/braden/'+req.params.recordID);
})

//Delete braden information
// router.delete('/del-braden/:recordID/:bradenID', ensureAuthenticated, ensureAuthorised, (req, res) => {
// 	MasterBraden.deleteOne({bradenID: req.params.bradenID}, function(err) {
// 		if (err) {
// 			console.log("cannot delete braden record");
// 		}
// 	});
// 	res.redirect('/student/braden/'+ req.params.recordID);
// })

//Edit braden information
router.put('/edit-braden/:recordID/:bradenID', ensureAuthenticated, (req,res) => {
	datetime = moment(req.body.dateBraden, 'DD/MM/YYYY').format('MM/DD/YYYY') + " ";
	total = parseInt(req.body.sensePerc.slice(-1)) + parseInt(req.body.moisture.slice(-1)) + parseInt(req.body.activity.slice(-1))+ parseInt(req.body.mobility.slice(-1)) 
		+ parseInt(req.body.nutrition.slice(-1)) + parseInt(req.body.fns.slice(-1));

	splitSensePerc = removeNumber.removeNumberFunction(req.body.sensePerc);
	splitMoisture = removeNumber.removeNumberFunction(req.body.moisture);
	splitActivity = removeNumber.removeNumberFunction(req.body.activity);
	splitMobility = removeNumber.removeNumberFunction(req.body.mobility);
	splitNutrition = removeNumber.removeNumberFunction(req.body.nutrition);
	splitFns = removeNumber.removeNumberFunction(req.body.fns);

	MasterBraden.findOne({ bradenID: req.params.bradenID }).then(editBraden => {
		editBraden.sensePercSplit = splitSensePerc,
		editBraden.moistureSplit = splitMoisture,
		editBraden.activitySplit = splitActivity,
		editBraden.mobilitySplit = splitMobility,
		editBraden.nutritionSplit = splitNutrition,
		editBraden.fnsSplit = splitFns,

		editBraden.date = req.body.dateBraden,
		editBraden.datetime = datetime,
		editBraden.sensePerc = req.body.sensePerc,
		editBraden.moisture = req.body.moisture,
		editBraden.activity = req.body.activity,
		editBraden.mobility = req.body.mobility,
		editBraden.nutrition = req.body.nutrition,
		editBraden.fns = req.body.fns,
		editBraden.total = total,

		editBraden.save();
	});
	res.redirect('/student/braden/' + req.params.recordID);
})

//open fall page
router.get('/fall/:recordID', ensureAuthenticated, (req, res) => {
	userType = req.user.userType == 'student';
	// MasterFall.find({ patientID: req.session.patient.patientID }).then(newFall => {

	MasterFall.find({ patientID: req.params.recordID }).then(newFall => {
		//console.log(newFall);
		userType = req.user.userType == 'student';
		if (req.user.userType == 'staff')
		{
			userType = 'student';
		}

		res.render('charts/master/charts-Fall', {
			// azureId: req.user.azure_oid,
			recordID: req.params.recordID,
			userType: userType,
			newFall: hbsSecurity.hbsFixArr(newFall),
			patient: req.session.patient,
			currentUserType: req.user.userType,
			studentFirstName: req.session.firstNameAndEmail,
			showMenu: true
		});
	})
})

//Add fall
router.post('/add-fall/:recordID', ensureAuthenticated, (req, res) => {
	fallID = (new standardID('AAA0000')).generate();
	datetime = moment(req.body.dateFall, 'DD/MM/YYYY').format('MM/DD/YYYY') + " ";

	totalmf = parseInt(req.body.history.slice(-2))
	+ parseInt(req.body.secondary.slice(-2)) 
	+ parseInt(req.body.ambu.slice(-2))
	+ parseInt(req.body.ivhl.slice(-2)) 
	+ parseInt(req.body.gait.slice(-2)) 
	+ parseInt(req.body.mental.slice(-2));
	//splitting to display only the sting value w/o (+0)

	splitHistory = removeNumber.removeNumberFunction(req.body.history);
	splitSecondary = removeNumber.removeNumberFunction(req.body.secondary);	
	splitAmbu = removeNumber.removeNumberFunction(req.body.ambu);
	splitIvhl = removeNumber.removeNumberFunction(req.body.ivhl);
	splitGait = removeNumber.removeNumberFunction(req.body.gait);
	splitMental = removeNumber.removeNumberFunction(req.body.mental);
	new MasterFall({
		patientID: req.params.recordID,
		// patientID: req.session.patient.patientID,
		fallID: fallID,
		date: req.body.dateFall,
		datetime: datetime,
		history: req.body.history,
		secondary: req.body.secondary,
		ivhl: req.body.ivhl,
		gait: req.body.gait,
		mental: req.body.mental,
		ambu: req.body.ambu,
		
		historySplit: splitHistory,
		secondarySplit: splitSecondary,
		ambuSplit: splitAmbu,
		ivhlSplit: splitIvhl,
		gaitSplit: splitGait,
		mentalSplit: splitMental,
		// by: req.user.azure_oid,

		totalmf: totalmf,


	}).save();

	res.redirect('/student/fall/'+ req.params.recordID);
})

//HISTORY TAKING
// Open HistoryTakng page
router.get('/HistoryTaking/:recordID', ensureAuthenticated,  (req, res) => {
	userType = req.user.userType == 'student';

	if (req.user.userType == 'staff')
	{
		userType = 'student';
		PatientStudentModel.findOne({recordID: req.params.recordID})
		.then(patientStudent => {//finding patientID and not equal to the user that u log in with hehe
			MasterHistory.find({patientID: req.session.patient.patientID, user:{'$ne': patientStudent.user} })
			.then(newHistory => {//(other record)
				MasterHistory.findOne({ masterpatientID: req.session.patient.patientID, user: patientStudent.user})
				.then(newOtherHistory =>{ //(your own record)
					MasterHistory.findOne({ masterpatientID: req.session.patient.patientID, user: patientStudent.user })
					.then(editHistory =>{ //(your own record --> form)
						//console.log("newHistory: "+ newHistory);
						res.render('HistoryTaking/student/add_HistoryTaking', {
							newHistory: hbsSecurity.hbsFixArr(newHistory),
							newOtherHistory:hbsSecurity.hbsFix(newOtherHistory),
							editHistory: hbsSecurity.hbsFix(editHistory),
							checkifEmpty: true,
							patient: req.session.patient,
							currentName: req.user.firstName,
							recordID: req.params.recordID,
							studentFirstName: req.session.firstNameAndEmail,
							currentUserType: req.user.userType,
							userType: userType,
							showMenu: true
						});
					});
				})
			})
		})
	}
	else
	{
		MasterHistory.find({patientID: req.session.patient.patientID, user:{'$ne':req.user.id} })
		.then(newHistory => {//(other record)
			MasterHistory.findOne({ masterpatientID: req.session.patient.patientID, user: req.user._id})
			.then(newOtherHistory =>{ //(your own record)
				MasterHistory.findOne({ masterpatientID: req.session.patient.patientID, by: req.user.firstName })
				.then(editHistory =>{ //(your own record --> form)
					//console.log("newHistory: "+ newHistory);
					res.render('HistoryTaking/student/add_HistoryTaking', {
						newHistory: hbsSecurity.hbsFixArr(newHistory),
						newOtherHistory:hbsSecurity.hbsFix(newOtherHistory),
						editHistory: hbsSecurity.hbsFix(editHistory),
						checkifEmpty: true,
						patient: req.session.patient,
						currentName: req.user.firstName,
						recordID: req.params.recordID,
						userType: userType,
						showMenu: true
					});
				});
			})
		})
	}
	
})
//Add HistoryTaking
router.post('/add-history/:recordID', ensureAuthenticated, (req, res) => {
	historyId = (new standardID('AAA0000')).generate();
	new MasterHistory({
		user: req.user.id,
		by: req.user.firstName,
		patientID: req.params.recordID,
		masterpatientID: req.session.patient.patientID,
		chiefComp: req.body.chiefComp,
		historyPresent: req.body.historyPresent,
		allergy: req.body.allergy,
		medicalH: req.body.medicalH,
		surgicalH: req.body.surgicalH,
		familyH: req.body.familyH,
		socialH: req.body.socialH,
		travelH: req.body.travelH,
		historyId: historyId
	}).save();
	res.redirect('/student/HistoryTaking/' + req.params.recordID );
})

//One HistoryTaking by ID
router.get('/HistoryTaking/:recordID/:historyId/:name', ensureAuthenticated, (req,res) => {
	
		userType = req.user.userType == 'student';

		if (req.user.userType == 'staff')
		{ 
			userType = 'student';

			PatientStudentModel.findOne({recordID: req.params.recordID})
			.then(patientStudent => {
				MasterHistory.find({patientID: req.session.patient.patientID, user:{'$ne': patientStudent.user}})
				.then(newHistory => {
					MasterHistory.findOne({  masterpatientID: req.session.patient.patientID, user: patientStudent.user})
					.then(newOtherHistory =>{
						
						MasterHistory.findOne({ historyId: req.params.historyId })
						.then(editHistory =>{
							
							//console.log("Edit History: "+ editHistory);

							var name = req.params.name;
							res.render('HistoryTaking/student/add_HistoryTaking',{
								newHistory:hbsSecurity.hbsFixArr(newHistory),
								editHistory: hbsSecurity.hbsFix(editHistory),
								patient: req.session.patient,
								userType: userType,
								recordID: req.params.recordID,
								newOtherHistory: hbsSecurity.hbsFix(newOtherHistory),
								currentName: req.user.firstName,
								by: name,
								checkifEmpty: false,
								currentUserType: req.user.userType,
								studentFirstName: req.session.firstNameAndEmail,
								showMenu: true
							})
						
						});
					});
				});
			});
		}
		else
		{
			MasterHistory.find({patientID: req.session.patient.patientID, user:{'$ne': req.user._id}})
			.then(newHistory => {
				MasterHistory.findOne({ historyId: req.params.historyId })
				.then(editHistory =>{
					
					//console.log("Edit History: "+ editHistory);
					MasterHistory.findOne({ masterpatientID: req.session.patient.patientID, user: req.user._id})
					.then(newOtherHistory =>{

						var name = req.params.name;
						res.render('HistoryTaking/student/add_HistoryTaking',{
							newHistory: hbsSecurity.hbsFixArr(newHistory),
							editHistory: hbsSecurity.hbsFix(editHistory),
							patient: req.session.patient,
							userType: userType,
							currentName: req.user.firstName,
							newOtherHistory: hbsSecurity.hbsFix(newOtherHistory),
							recordID: req.params.recordID,
							by: name,
							checkifEmpty: false,
							currentUserType: req.user.userType,
							showMenu: true
						})
					})
				});
			});
		}
})

// router.get('/HistoryTaking/:recordID/:historyId', ensureAuthenticated, (req,res) => {
	
// 	MasterHistory.find({ masterpatientID: req.session.patient.patientID, patientID:req.session.patient.patientID}).then(newHistory => {
// 		if (req.user.userType == 'staff')
// 		{ 
// 			userType = 'student';
// 			PatientStudentModel.findOne({recordID: req.params.recordID})
// 			.then(patientStudent => {
				
// 				EMR_User.findById(patientStudent.user)	// findById is Mongoose utility method
// 				.then(user => { 
// 					MasterHistory.find({ patientID: req.session.patient.patientID}).then(newOtherHistory =>{
// 						MasterHistory.findOne({ masterpatientID: req.session.patient.patientID, by: user.firstName }).then(editHistory =>{
						
// 							if (req.user.userType == 'staff')
// 							{
// 								userType = 'student';
// 							}

// 							res.render('HistoryTaking/student/add_HistoryTaking',{
// 								newHistory:newHistory,
// 								editHistory: editHistory,
// 								patient: req.session.patient,
// 								userType: userType,
// 								recordID: req.params.recordID,
// 								newOtherHistory: newOtherHistory,
// 								currentUserType: req.user.userType,
// 								showMenu: true
// 							})
						
// 						});
// 					});
// 				})
// 			})
// 		}
// 		else
// 		{
// 			userType = req.user.userType == 'student';

// 			MasterHistory.findOne({ masterpatientID: req.session.patient.patientID, by: req.user.firstName }).then(editHistory =>{

// 				if (req.user.userType == 'staff')
// 				{
// 					userType = 'student';
// 				}
// 				res.render('HistoryTaking/student/add_HistoryTaking',{
// 					newHistory:newHistory,
// 					editHistory: editHistory,
// 					patient: req.session.patient,
// 					userType: userType,
// 					recordID: req.params.recordID,
// 					currentUserType: req.user.userType,
// 					showMenu: true
// 				})
			
// 			});
// 		}
// 	})
// })

//Edit the HistoryTaking
router.put('/edit-history/:recordID/:historyId/:name', ensureAuthenticated, (req,res) => {
	MasterHistory.findOne({masterpatientID: req.session.patient.patientID, historyId: req.params.historyId}).then(editHistory => {
		
		editHistory.chiefComp = req.body.chiefComp,
		editHistory.historyPresent = req.body.historyPresent,
		editHistory.allergy = req.body.allergy,
		editHistory.medicalH = req.body.medicalH,
		editHistory.surgicalH = req.body.surgicalH,
		editHistory.familyH = req.body.familyH,
		editHistory.socialH = req.body.socialH,
		editHistory.travelH = req.body.travelH

		editHistory.save();
	});
	res.redirect("/student/HistoryTaking/" + req.params.recordID);
})
	
//get single fall info
router.get('/fall/:recordID/:fallID', ensureAuthenticated, (req, res) => {
	userType = req.user.userType == 'student';
	MasterFall.find({ patientID: req.params.recordID }).then(newFall => {
		// MasterFall.find({ patientID: req.session.patient.patientID }).then(newFall => {

		MasterFall.findOne({ fallID: req.params.fallID }).then(editFall => {
			res.render('charts/master/charts-fall', {
				azureId: req.user.azure_oid,
				recordID: req.params.recordID,
				userType: userType,
				newFall: hbsSecurity.hbsFixArr(newFall),
				editFall: hbsSecurity.hbsFix(editFall),
				patient: req.session.patient,
				showMenu: true			
			})
		})
	})
})

//Edit fall information
router.put('/edit-fall/:recordID/:fallID', ensureAuthenticated, (req,res) => {
	datetime = moment(req.body.dateFall, 'DD/MM/YYYY').format('MM/DD/YYYY') + " ";

		totalmf = parseInt(req.body.history.slice(-2))
		+ parseInt(req.body.secondary.slice(-2)) 
		+ parseInt(req.body.ambu.slice(-2))
		+ parseInt(req.body.ivhl.slice(-2)) 
		+ parseInt(req.body.gait.slice(-2)) 
		+ parseInt(req.body.mental.slice(-2));

		splitHistory = removeNumber.removeNumberFunction(req.body.history);
		splitSecondary = removeNumber.removeNumberFunction(req.body.secondary);	
		splitAmbu = removeNumber.removeNumberFunction(req.body.ambu);
		splitIvhl = removeNumber.removeNumberFunction(req.body.ivhl);
		splitGait = removeNumber.removeNumberFunction(req.body.gait);
		splitMental = removeNumber.removeNumberFunction(req.body.mental);
		
		MasterFall.findOne({ fallID: req.params.fallID }).then(editFall => {
			editFall.date = req.body.dateFall,
			editFall.datetime = datetime,
			editFall.history = req.body.history,
			editFall.secondary = req.body.secondary,
			editFall.ambu = req.body.ambu,
			editFall.ivhl = req.body.ivhl,
			editFall.gait = req.body.gait,
			editFall.mental = req.body.mental,
			
			editFall.historySplit = splitHistory,
			editFall.secondarySplit = splitSecondary,
			editFall.ambuSplit = splitAmbu,
			editFall.ivhlSplit = splitIvhl,
			editFall.gaitSplit = splitGait,
			editFall.mentalSplit = splitMental,

			editFall.totalmf = totalmf
		
			editFall.save();
	});
	res.redirect('/student/fall/' + req.params.recordID);
})

// mdp page
router.get('/mdp/:recordID', ensureAuthenticated, (req, res) => {
	userType = req.user.userType == 'student';
	if (req.user.userType == 'staff')
	{
		userType = 'student';
		PatientStudentModel.findOne({recordID: req.params.recordID})
		.then(patientStudent => {

			StudentMDP.find({user: patientStudent.user, patientID: req.session.patient.patientID}).sort({'datetime':1})
			.then(newMDP => { // mdp that they have created

				MasterMDP.find({patientID: req.session.patient.patientID})
				.then(newMasterMDP=> {
					//console.log("************ newMasterMDP: "+ JSON.stringify(newMasterMDP));
					res.render('mdp-notes/student/mdp', {
						recordID: req.params.recordID,
						newMasterMDP: hbsSecurity.hbsFixArr(newMasterMDP),
						newMDP: hbsSecurity.hbsFixArr(newMDP),
						userType: userType,
						currentUserType: req.user.userType,
						patient: req.session.patient,
						studentFirstName: req.session.firstNameAndEmail,
						showMenu: true
					});
				})	
			})
		})
		
	}
	else
	{
		StudentMDP.find({user: req.user.id, patientID: req.session.patient.patientID}).sort({'datetime':1})
		.then(newMDP => { // mdp that they have created

			MasterMDP.find({patientID: req.session.patient.patientID})
			.then(newMasterMDP=> { 
				//console.log("************ newMasterMDP: "+ JSON.stringify(newMasterMDP));
				res.render('mdp-notes/student/mdp', {
					recordID: req.params.recordID,
					newMasterMDP: hbsSecurity.hbsFixArr(newMasterMDP),
					newMDP: hbsSecurity.hbsFixArr(newMDP),
					userType: userType,
					currentUserType: req.user.userType,
					patient: req.session.patient,
					showMenu: true
				});
			})
		})
	}
})
// add MDP page
router.post('/add-mdp/:recordID', ensureAuthenticated,(req, res) => {
	mdpID = (new standardID('AAA0000')).generate();
	datetime = moment(req.body.dateMDP, 'DD/MM/YYYY').format('MM/DD/YYYY') + " " + req.body.timeMDP;
	new StudentMDP({
		patientID: req.session.patient.patientID,
		studentPatientID: req.params.recordID,
		user: req.user.id,
		createdBy: req.user.firstName,
		mdpID: mdpID,
		date: moment(req.body.dateMDP, 'DD/MM/YYYY').format('YYYY-MM-DD'),
		time: req.body.timeMDP,
		datetime: datetime,
		selectUser: req.body.selectUser,
		nameOfHealthProvider: req.body.nameOfHealthProvider,
		progressNotes: req.body.progressNotes
	}).save();
	res.redirect('/student/mdp/'+req.params.recordID);
})
// delete MDP page
router.delete('/del-mdp/:recordID/:mdpID', ensureAuthenticated, (req, res) => {
	StudentMDP.deleteOne({mdpID: req.params.mdpID}, function(err) {
		if (err) {
			console.log("cannot delete mdp details");
		}
	});
	res.redirect('/student/mdp/'+ req.params.recordID);
})

// get single MDP info
router.get('/mdp/:recordID/:mdpID', ensureAuthenticated, (req, res) => {
	userType = req.user.userType == 'student';
	if (req.user.userType == 'staff')
	{
		userType = 'student';
	}
	StudentMDP.find({ patientID: req.session.patient.patientID, user: req.user.id}).sort({'datetime':1}).then(newMDP => {
		StudentMDP.findOne({ mdpID: req.params.mdpID}).then(editMDP => {

			MasterMDP.find({patientID: req.session.patient.patientID})
			.then(newMasterMDP=> { 
				//console.log("editMDP: "+ editMDP);
				editMDP.date = moment(editMDP.date, 'YYYY-MM-DD').format('DD/MM/YYYY');
				res.render('mdp-notes/student/mdp', {
					userType: userType,
					recordID: req.params.recordID,
					newMDP: hbsSecurity.hbsFixArr(newMDP),
					editMDP: hbsSecurity.hbsFix(editMDP),
					patient: req.session.patient,
					currentUserType: req.user.userType,
					newMasterMDP: hbsSecurity.hbsFixArr(newMasterMDP),
					showMenu: true
				});
			})
		})
	})
})

// edit MDP informations
router.put('/edit-mdp/:recordID/:mdpID', ensureAuthenticated, (req,res) => {
	datetime = moment(req.body.dateMDP, 'DD/MM/YYYY').format('MM/DD/YYYY') + " " + req.body.timeMDP;

	StudentMDP.findOne({ mdpID: req.params.mdpID}).then(editMDP => {
		editMDP.date = moment(req.body.dateMDP, 'DD/MM/YYYY').format('YYYY-MM-DD'),
		editMDP.time = req.body.timeMDP,
		editMDP.datetime = datetime,
		editMDP.selectUser = req.body.selectUser,
		editMDP.nameOfHealthProvider = req.body.nameOfHealthProvider,
		editMDP.progressNotes = req.body.progressNotes

		editMDP.save().then(editMDP => {
			res.redirect("/student/mdp/"+editMDP.studentPatientID);
		});
	});
	
})

// Care Plan
router.get('/CarePlan/:recordID', ensureAuthenticated, (req, res) => {
	userType = req.user.userType == 'student';

		console.log("patientID: req.session.patient.patientID: "+ req.params.recordID);
		if (req.user.userType == 'staff')
		{
			userType = 'student';
			PatientStudentModel.findOne({recordID: req.params.recordID})
			.then(patientStudent => {

				console.log("patientID: req.session.patient.patientID: "+ patientStudent.user);
				StudentCarePlan.find({user: patientStudent.user, patientID: req.session.patient.patientID}).sort({'datetime': 1})
				.then(newCarePlan => {
					
					//console.log("****newCarePlan: "+patientStudent.user);
					res.render('care-plan/student/care-plan', {
						recordID: req.params.recordID,
						// newMasterMDP: newMasterMDP,
						newCarePlan: hbsSecurity.hbsFixArr(newCarePlan),
						userType: userType,
						patient: req.session.patient,
						currentUserType: req.user.userType,
						studentFirstName: req.session.firstNameAndEmail,	
						showMenu: true
					});
				})
			})
		}
		else
		{
			StudentCarePlan.find({user: req.user.id, patientID: req.session.patient.patientID}).sort({'datetime': 1})
			.then(newCarePlan => {
				res.render('care-plan/student/care-plan', {
					recordID: req.params.recordID,
					// newMasterMDP: newMasterMDP,
					newCarePlan: hbsSecurity.hbsFixArr(newCarePlan),
					userType: userType,
					patient: req.session.patient,
					currentUserType: req.user.userType,
					showMenu: true
				});
			})
		}
})

// add Care Plan
router.post('/add-CarePlan/:recordID', ensureAuthenticated,(req, res) => {
	carePlanID = (new standardID('AAA0000')).generate();
	datetime = moment(req.body.dateCarePlan, 'DD/MM/YYYY').format('MM/DD/YYYY') + " " + req.body.timeCarePlan;
	new StudentCarePlan({
		patientID: req.session.patient.patientID,
		studentPatientID: req.params.recordID,
		user: req.user.id,
		createdBy: req.user.firstName,
		carePlanID: carePlanID,
		date: moment(req.body.dateCarePlan, 'DD/MM/YYYY').format('YYYY-MM-DD'),
		time: req.body.timeCarePlan,
		datetime: datetime,
		problemIdentified: req.body.problemIdentified,
		categoryOfNursingIssues: req.body.categoryOfNursingIssues,
		assessment: req.body.assessment,
		goalAndExpectedOutcomes: req.body.goalAndExpectedOutcomes,
		interventions: req.body.interventions,
		rationale: req.body.rationale,
		evaluations: req.body.evaluations
	}).save();
	res.redirect('/student/CarePlan/'+req.params.recordID);
})

// get single Care Plan info
router.get('/CarePlan/:recordID/:carePlanID', ensureAuthenticated, (req, res) => {
	userType = req.user.userType == 'student';
	
	if (req.user.userType == 'staff')
	{
		userType = 'student';
		PatientStudentModel.findOne({recordID: req.params.recordID})
		.then(patientStudent => {

			StudentCarePlan.find({ patientID: req.session.patient.patientID, user:  patientStudent.user}).sort({'datetime':1})
			.then(newCarePlan => {

				StudentCarePlan.findOne({ carePlanID: req.params.carePlanID })
				.then(editCarePlan => {
					
					editCarePlan.date = moment(editCarePlan.date, 'YYYY-MM-DD').format('DD/MM/YYYY');
					
					res.render('care-plan/student/care-plan', {
						userType: userType,
						recordID: req.params.recordID,
						newCarePlan: hbsSecurity.hbsFixArr(newCarePlan),
						editCarePlan: hbsSecurity.hbsFix(editCarePlan),
						patient: req.session.patient,
						currentUserType: req.user.userType,
						studentFirstName: req.session.firstNameAndEmail,
						showMenu: true
					});
				});
			});
		});
	}
	else
	{
		StudentCarePlan.find({ patientID: req.session.patient.patientID, user: req.user.id}).sort({'datetime':1})
		.then(newCarePlan => {
			StudentCarePlan.findOne({ carePlanID: req.params.carePlanID })
			.then(editCarePlan => {
				
				editCarePlan.date = moment(editCarePlan.date, 'YYYY-MM-DD').format('DD/MM/YYYY');
				
				res.render('care-plan/student/care-plan', {
					userType: userType,
					recordID: req.params.recordID,
					newCarePlan: hbsSecurity.hbsFixArr(newCarePlan),
					editCarePlan: hbsSecurity.hbsFix(editCarePlan),
					patient: req.session.patient,
					currentUserType: req.user.userType,
					showMenu: true
				});
			});
		});
	}
	
})

// edit Care Plan informations
router.put('/edit-CarePlan/:recordID/:carePlanID', ensureAuthenticated, (req,res) => {
	datetime = moment(req.body.dateCarePlan, 'DD/MM/YYYY').format('MM/DD/YYYY') + " " + req.body.timeCarePlan;

	StudentCarePlan.findOne({ carePlanID: req.params.carePlanID}).then(editCarePlan => {
		editCarePlan.date = moment(req.body.dateCarePlan, 'DD/MM/YYYY').format('YYYY-MM-DD'),
		editCarePlan.time = req.body.timeCarePlan,
		editCarePlan.datetime = datetime,
		editCarePlan.problemIdentified = req.body.problemIdentified,
		editCarePlan.categoryOfNursingIssues = req.body.categoryOfNursingIssues,
		editCarePlan.assessment = req.body.assessment,
		editCarePlan.goalAndExpectedOutcomes = req.body.goalAndExpectedOutcomes,
		editCarePlan.interventions = req.body.interventions,
		editCarePlan.rationale = req.body.rationale,
		editCarePlan.evaluations = req.body.evaluations

		editCarePlan.save().then(editCarePlan => {
			res.redirect("/student/CarePlan/"+editCarePlan.studentPatientID);
		});
	});
})

//Remove function
var removeNumber = {
    removeNumberFunction: function(str) {
		var i;
		var text = "";
        var res = str.split(" ");
		for (i = 0; i < res.length; i++) {
			
			if (!(res[i] == "+" || isNaN(res[i]) == false || res[i].charAt(0) == "+")){
			text += res[i] + " ";
			}
		}
		
		return text;
    }
};

//nursing-assessment
// retrieves the  nursing assessment record to edit
//:patientID may be unncessary in this case because patient object is stored in session
router.get('/show-nursing-assessment/:recordID/:patientID', ensureAuthenticated, (req, res) => {
	
	userType = req.user.userType == 'student';
	if (req.user.userType == 'staff')
	{
		userType = 'student';
	}
	PatientStudentModel.findOne({
		//patientID: req.params.patientID		// gets current patient
		recordID: req.params.recordID
	})
	.then(retrievedPatient => {
		if((JSON.stringify(retrievedPatient.user._id) === JSON.stringify(req.user.id)) || (req.user.userType == "staff")) {
			NursingAssessmentModel.findById(retrievedPatient.nursingAssessmentID,{
				// new way of calling method
			}).then(assessment => {
				//let toaster = new Toaster('Retrieving nursing assessment record');
				req.session.assessment = assessment; // save to session for saving updated info

				res.render('master/master-edit-nursing-assessment', {
					assessment: assessment,
					patient: hbsSecurity.hbsFix(retrievedPatient),
					user: req.user,
					showMenu: true,
					userType: userType,
					currentUserType: req.user.userType,
					studentFirstName: req.session.firstNameAndEmail,
					recordID: req.params.recordID
				});
			});
		}else {
			console.log('User that created record is different from this user');
			//alertMessage.flashMessage(res, 'User that created record is different from current user', 'fas fa-exclamation',
			// true);
			toaster.setErrorMessage(' ', 'User that created record is different from this user');
			res.redirect('/student/list-patients');
		}
	});
});


// saves edited/updated nursing assessment form
router.put('/save-nursing-assessment/:recordID/:patientID/:nursingAssessmentID', ensureAuthenticated, (req, res) => {
	console.log('Assessment id: ' + req.session.assessment._id);
	
	// Todo: check authorised user
	userType = req.user.userType == 'student';
	NursingAssessmentModel.findByIdAndUpdate(
		// the id of the item to find
		req.params.nursingAssessmentID,
		req.body, // will default all boolean radio buttons to false even if no selection is made
		{new: true},
		// the callback function
		(err, assessment) => {
			// Handle any possible database errors
			if (err) {
				return res.status(500).send(err);
			}
			//alertMessage.flashMessage(res, 'Nursing assessment updated', 'far fa-thumbs-up', true);
			toaster.setSuccessMessage(' ', 'Nursing Assessment Updated');
			res.render('master/master-edit-nursing-assessment', {
				assessment: hbsSecurity.hbsFix(assessment),
				patient: req.session.patient,
				user: req.user,
				toaster,
				showMenu: true,
				userType: userType,
				recordID: req.params.recordID
			});
			/*if (req.user.userType === 'staff'){
			
			} else {
				res.redirect('/student/list-patients');
			}*/
			
		}
	);
});

// Retrieves existing patient master page to edit
router.get('/edit/:recordID/:patientID', ensureAuthenticated, (req, res) => {
	userType = req.user.userType == 'student';
	PatientStudentModel.findOne({
		// patientID: req.params.patientID			// gets current user
		recordID: req.params.recordID
	})
	.populate('user')							// gets user from emr-users collection
	.then(patient => {

		// check if logged in user is owner of this patient record or if logged in user is a staff
		if((JSON.stringify(patient.user._id) === JSON.stringify(req.user.id)) || (req.user.userType == 'staff')) {
			
			userType = req.user.userType == 'student';
			if (req.user.userType == 'staff') // if it's a staff, change userType to student so that the navbar is changed to student route
			{
				userType = 'student';
			}
			
			req.session.firstNameAndEmail = patient.creator + " (" + patient.creatorEmail.split("@")[0] + ")" // firstName + email

			//req.session.patient = patient;				// adds object to session
			res.render('student/student-edit-patient', { // calls handlebars
				patient: hbsSecurity.hbsFix(patient),
				userType: userType,
				currentUserType: req.user.userType,
				studentFirstName: req.session.firstNameAndEmail,
				recordID: req.params.recordID,
				showMenu: true							// shows menu using unless
			});
		} else {
			console.log('Invalid User: not allowed to edit patient');
			//alertMessage.flashMessage(res, 'User that created record is different from this user', 'fas
			// fa-exclamation', true);
			toaster.setErrorMessage('User that created record is different from this user');
		}
	});
});

//START OF DIABETIC
//Load Diabetic page
router.get('/diabetic/:recordID', ensureAuthenticated, (req, res) => {
	userType = req.user.userType == 'student';
	MasterDiabetic.find({ patientID: req.params.recordID}).sort({'datetime':1}).then(newDiabetic => {

					diabeticsample = [];
					diabeticsampleDate = [];
					let diabeticFlow = Object.assign([], newDiabetic);
					
					diabeticCount = -1;
					
					diabeticnoRecord = 'No existing record';

					newDiabetic.forEach(diabetic => {
						//if (!(diabeticsample.includes(diabetic.datetime))) {
							diabeticsample.push(diabetic.datetime);
							diabeticsampleDate.push(diabetic.date);
						//}
					});
					diabeticsample.sort();
					diabeticsampleDate.sort();

					for (i = 0; i < diabeticsample.length; i++) {
						

						//Counter for empty data
						//.length here refers to last index of the array
						if (diabeticCount !== (diabeticFlow.length - 1)) {
							diabeticCount++;
						}
						//Insert empty data when value doesnt match
						//Count here does the index count of flow array
						if(diabeticFlow !='') 
						{
							if (diabeticsample[i] < diabeticFlow[diabeticCount].datetime) {
								diabeticFlow.splice(diabeticCount, 0, {datetime: ''});
							} else if (diabeticsample[i] > diabeticFlow[diabeticCount].datetime) {
								diabeticFlow.splice(diabeticCount + 1, 0, {datetime: ''});
							}
						} 
						else
						{
							diabeticFlow.push({datetime: '', poc: diabeticnoRecord});
						}

						
					};
					userType = req.user.userType == 'student';
					if (req.user.userType == 'staff')
					{
						userType = 'student';
					}

					res.render('charts/master/charts-diabetic', {
						recordID: req.params.recordID,
						userType: userType,
						diabeticdateVal: diabeticsample,
						diabeticFlow: hbsSecurity.hbsFixArr(diabeticFlow),
						newDiabetic: hbsSecurity.hbsFixArr(newDiabetic),
						patient: req.session.patient,
						currentUserType: req.user.userType,
						studentFirstName: req.session.firstNameAndEmail,
						showMenu: true
					})
				})
			})

//get single Diabetic info
router.get('/diabetic/:recordID/:diabeticID', ensureAuthenticated, (req, res) => {
	userType = req.user.userType == 'student';
	// MasterBraden.find({ patientID: req.session.patient.patientID }).then(newBraden => {
		MasterDiabetic.find({ patientID: req.params.recordID }).sort({'datetime':1}).then(newDiabetic => {
		MasterDiabetic.findOne({ diabeticID: req.params.diabeticID }).then(editDiabetic => {
			editDiabetic.date = moment(editDiabetic.date, 'YYYY-MM-DD').format('DD/MM/YYYY');
			res.render('charts/master/charts-diabetic', {
				// azureId: req.user.azure_oid,
				recordID: req.params.recordID,
				userType: userType,
				newDiabetic: hbsSecurity.hbsFixArr(newDiabetic),
				editDiabetic: hbsSecurity.hbsFix(editDiabetic),
				patient: req.session.patient,
				showMenu: true			
			})
		})
	})
})
//add diabetic info
router.post('/add-diabetic/:recordID', ensureAuthenticated, (req, res) => {
	diabeticID = (new standardID('AAA0000')).generate();
	datetime = moment(req.body.dateDiabetic, 'DD/MM/YYYY').format('MM/DD/YYYY') + " "+ req.body.timeDiabetic;
	splitpoc = req.body.poc.slice(0,2);


	new MasterDiabetic({
			// patientID: req.session.patient.patientID,
			patientID: req.params.recordID,
			diabeticID: diabeticID,
			date: moment(req.body.dateDiabetic, 'DD/MM/YYYY').format('YYYY-MM-DD'),
			datetime: datetime,
			time: req.body.timeDiabetic,
			poc: req.body.poc,
			bgl:	req.body.bgl,
			insulintype: req.body.insulintype,
			insulinamt: req.body.insulinamt,
			hypoagent: req.body.hypoagent,
			splitpoc: splitpoc,

	}).save();

	res.redirect('/student/diabetic/'+req.params.recordID);
})

//Edit diabetic information
router.put('/edit-diabetic/:recordID/:diabeticID', ensureAuthenticated, (req,res) => {
	datetime = moment(req.body.dateDiabetic, 'DD/MM/YYYY').format('MM/DD/YYYY') + " "+ req.body.timeDiabetic;
	splitpoc = req.body.poc.slice(0,2);
	
	MasterDiabetic.findOne({ diabeticID: req.params.diabeticID }).then(editDiabetic => {
		editDiabetic.date = moment(req.body.dateDiabetic, 'DD/MM/YYYY').format('YYYY-MM-DD'),
		editDiabetic.time = req.body.timeDiabetic,
		editDiabetic.datetime = datetime,
		editDiabetic.poc = req.body.poc,
		editDiabetic.bgl = req.body.bgl,
		editDiabetic.insulintype = req.body.insulintype,
		editDiabetic.insulinamt = req.body.insulinamt,
		editDiabetic.hypoagent = req.body.hypoagent,
		editDiabetic.splitpoc = splitpoc,

		editDiabetic.save();
	});
	res.redirect('/student/diabetic/' + req.params.recordID);
})


//END OF DIABETIC

//Load Neurovascular page
router.get('/neuro/:recordID', ensureAuthenticated, (req, res) => {
	userType = req.user.userType == 'student';
	MasterNeuro.find({ patientID: req.params.recordID}).sort({'datetime':1}).then(newNeuro => {

		// Right arm
		MasterNeuro.find({ patientID: req.params.recordID, siteOfInjury: "Right Arm" }).sort({'datetime':1}).then(newNeuroRightArm => {

			// Left arm
			MasterNeuro.find({ patientID: req.params.recordID, siteOfInjury: "Left Arm" }).sort({'datetime':1}).then(newNeuroLeftArm => {

				// Right leg
				MasterNeuro.find({ patientID: req.params.recordID, siteOfInjury: "Right Leg" }).sort({'datetime':1}).then(newNeuroRightLeg => {

					// Left leg
					MasterNeuro.find({ patientID: req.params.recordID, siteOfInjury: "Left Leg" }).sort({'datetime':1}).then(newNeuroLeftLeg => {

						// right arm
						var rightArmNeuroFlowLength = 0;
						// left arm
						var leftArmNeuroFlowLength = 0;
						// right leg
						var rightLegNeuroFlowLength = 0;
						// left leg
						var leftLegNeuroFlowLength = 0;

						// Right Arm
						if (!(isNaN(newNeuroRightArm.length)))
						{
							rightArmNeuroFlowLength = newNeuroRightArm.length
						}
						rightArmNeuroFlowLength = rightArmNeuroFlowLength * 2; // rowspan to merge same site of injury on right arm

						//Left Arm
						if (!(isNaN(newNeuroLeftArm.length)))
						{
							leftArmNeuroFlowLength = newNeuroLeftArm.length
						}
						leftArmNeuroFlowLength = leftArmNeuroFlowLength * 2; // rowspan to merge same site of injury on left arm
						
						// Right Leg
						if (!(isNaN(newNeuroRightLeg.length)))
						{
							rightLegNeuroFlowLength = newNeuroRightLeg.length
						}
						rightLegNeuroFlowLength = rightLegNeuroFlowLength * 2; // rowspan to merge same site of injury on right leg

						//Left Leg
						if (!(isNaN(newNeuroLeftLeg.length)))
						{
							leftLegNeuroFlowLength = newNeuroLeftLeg.length
						}
						leftLegNeuroFlowLength = leftLegNeuroFlowLength * 2; // rowspan to merge same site of injury on left arm

						neurosample = [];
						neurosampleDate = [];
						let neuroFlow = Object.assign([], newNeuro); // used to copy the values of all enumerable own properties
						
						neuroCount = -1;
						
						neuronoRecord = 'No existing record';

						newNeuro.forEach(neuro => {
							// if (!(neurosample.includes(neuro.datetime))) {
								neurosample.push(neuro.datetime);
								neurosampleDate.push(neuro.date);
							// }
						});
						neurosample.sort();
						neurosampleDate.sort();

						for (i = 0; i < neurosample.length; i++) {
						
							//Counter for empty data
							//.length here refers to last index of the array
							if (neuroCount !== (neuroFlow.length - 1)) { // until it gets to 2
								//console.log("neuroCount: "+neuroCount);
								//console.log("neuroFlow.length: "+ (neuroFlow.length - 1));
								neuroCount++;
								
							}
							//Insert empty data when value doesnt match
							//Count here does the index count of flow array
							if(neuroFlow !='') 
							{
								if (neurosample[i] < neuroFlow[neuroCount].datetime) {
									neuroFlow.splice(neuroCount, 0, {datetime: ''});
								} else if (neurosample[i] > neuroFlow[neuroCount].datetime) {
									neuroFlow.splice(neuroCount + 1, 0, {datetime: ''});
								}
							} 
							else
							{
								neuroFlow.push({datetime: '', poc: diabeticnoRecord});
							}

							
						};
						userType = req.user.userType == 'student';
						if (req.user.userType == 'staff')
						{
							userType = 'student';
						}

						res.render('charts/master/charts-neuro', {
							recordID: req.params.recordID,
							userType: userType,
							neurodateVal: neurosample,
							neuroFlow: hbsSecurity.hbsFixArr(neuroFlow),
							newNeuro: hbsSecurity.hbsFixArr(newNeuro),
							patient: req.session.patient,
							newNeuroRightArm: hbsSecurity.hbsFixArr(newNeuroRightArm),
							newNeuroLeftArm: hbsSecurity.hbsFixArr(newNeuroLeftArm),
							newNeuroRightLeg: hbsSecurity.hbsFixArr(newNeuroRightLeg),
							newNeuroLeftLeg: hbsSecurity.hbsFixArr(newNeuroLeftLeg),
							rightArmRowSpan: hbsSecurity.hbsFixArr(rightArmNeuroFlowLength),
							leftArmRowSpan: hbsSecurity.hbsFixArr(leftArmNeuroFlowLength),
							rightLegRowSpan: hbsSecurity.hbsFixArr(rightLegNeuroFlowLength),
							leftLegRowSpan: hbsSecurity.hbsFixArr(leftLegNeuroFlowLength),
							currentUserType: req.user.userType,
							studentFirstName: req.session.firstNameAndEmail,
							showMenu: true
						})
					})
				})
			})
		})
	})
})

//get single Neurovascular info
router.get('/neuro/:recordID/:neuroID', ensureAuthenticated, (req, res) => {
	userType = req.user.userType == 'student';
	MasterNeuro.find({ patientID: req.params.recordID }).sort({'datetime':1}).then(newNeuro => {
		// Right arm
		MasterNeuro.find({ patientID: req.params.recordID, siteOfInjury: "Right Arm" }).sort({'datetime':1}).then(newNeuroRightArm => {
			// Left arm
			MasterNeuro.find({ patientID: req.params.recordID, siteOfInjury: "Left Arm" }).sort({'datetime':1}).then(newNeuroLeftArm => {
				// Right leg
				MasterNeuro.find({ patientID: req.params.recordID, siteOfInjury: "Right Leg" }).sort({'datetime':1}).then(newNeuroRightLeg => {
					// Left leg
					MasterNeuro.find({ patientID: req.params.recordID, siteOfInjury: "Left Leg" }).sort({'datetime':1}).then(newNeuroLeftLeg => {
						MasterNeuro.findOne({ neuroID: req.params.neuroID }).then(editNeuro => {
							
							// right arm
							var rightArmNeuroFlowLength = 0;
							// left arm
							var leftArmNeuroFlowLength = 0;
							// right leg
							var rightLegNeuroFlowLength = 0;
							// left leg
							var leftLegNeuroFlowLength = 0;

							// Right Arm
							if (!(isNaN(newNeuroRightArm.length)))
							{
								rightArmNeuroFlowLength = newNeuroRightArm.length
							}
							rightArmNeuroFlowLength = rightArmNeuroFlowLength * 2; // rowspan to merge same site of injury on right arm

							//Left Arm
							if (!(isNaN(newNeuroLeftArm.length)))
							{
								leftArmNeuroFlowLength = newNeuroLeftArm.length
							}
							leftArmNeuroFlowLength = leftArmNeuroFlowLength * 2; // rowspan to merge same site of injury on left arm
							
							// Right Leg
							if (!(isNaN(newNeuroRightLeg.length)))
							{
								rightLegNeuroFlowLength = newNeuroRightLeg.length
							}
							rightLegNeuroFlowLength = rightLegNeuroFlowLength * 2; // rowspan to merge same site of injury on right leg

							//Left Leg
							if (!(isNaN(newNeuroLeftLeg.length)))
							{
								leftLegNeuroFlowLength = newNeuroLeftLeg.length
							}
							leftLegNeuroFlowLength = leftLegNeuroFlowLength * 2; // rowspan to merge same site of injury on left arm

							editNeuro.date = moment(editNeuro.date, 'YYYY-MM-DD').format('DD/MM/YYYY');
							res.render('charts/master/charts-neuro', {
								// azureId: req.user.azure_oid,
								recordID: req.params.recordID,
								userType: userType,
								newNeuro: hbsSecurity.hbsFixArr(newNeuro),
								editNeuro: hbsSecurity.hbsFix(editNeuro),
								patient: req.session.patient,
								newNeuroRightArm: hbsSecurity.hbsFixArr(newNeuroRightArm),
								newNeuroLeftArm: hbsSecurity.hbsFixArr(newNeuroLeftArm),
								newNeuroRightLeg: hbsSecurity.hbsFixArr(newNeuroRightLeg),
								newNeuroLeftLeg: hbsSecurity.hbsFixArr(newNeuroLeftLeg),
								rightArmRowSpan: hbsSecurity.hbsFixArr(rightArmNeuroFlowLength),
								leftArmRowSpan: hbsSecurity.hbsFixArr(leftArmNeuroFlowLength),
								rightLegRowSpan: hbsSecurity.hbsFixArr(rightLegNeuroFlowLength),
								leftLegRowSpan: hbsSecurity.hbsFixArr(leftLegNeuroFlowLength),
								showMenu: true			
							})
						})
					})
				})
			})
		})
	})
})
//add Neurovascular info
router.post('/add-neuro/:recordID', ensureAuthenticated, (req, res) => {
	neuroID = (new standardID('AAA0000')).generate();
	datetime = moment(req.body.dateNeuro, 'DD/MM/YYYY').format('MM/DD/YYYY') + " "+ req.body.timeNeuro;
	//splitpoc = req.body.poc.slice(0,2);


	new MasterNeuro({
			// patientID: req.session.patient.patientID,
			patientID: req.params.recordID,
			neuroID: neuroID,
			datetime: datetime,
			date: moment(req.body.dateNeuro, 'DD/MM/YYYY').format('YYYY-MM-DD'),
			time: req.body.timeNeuro,
			siteOfInjury: req.body.siteOfInjury,
			colourLeft: req.body.leftColour,
			colourRight: req.body.rightColour,
			temperatureLeft: req.body.leftTemperature,
			temperatureRight: req.body.rightTemperature,
			capillaryRefillLeft: req.body.leftCapillaryRefill,
			capillaryRefillRight: req.body.rightCapillaryRefill,
			peripheralPulseLeft: req.body.leftPeripheralPulse,
			peripheralPulseRight: req.body.rightPeripheralPulse,
			edemaLeft: req.body.leftEdema,
			edemaRight: req.body.rightEdema,
			movementLeft: req.body.leftMovement,
			movementRight: req.body.rightMovement,
			sensationLeft: req.body.leftSensation,
			sensationRight: req.body.rightSensation,
			painScale: req.body.painScale,
			painRight: req.body.rightTypeOfPainScale,
			numericalRatingScaleLeft: req.body.numericalRatingScaleLeft,
			numericalRatingScaleRight: req.body.numericalRatingScaleRight,
			characteristicLeft: req.body.leftCharacteristic,
			characteristicRight: req.body.rightCharacteristic

	}).save();

	res.redirect('/student/neuro/'+req.params.recordID);
})

//Edit Neurovascular information
router.put('/edit-neuro/:recordID/:neuroID', ensureAuthenticated, (req,res) => {
	datetime = moment(req.body.dateNeuro, 'DD/MM/YYYY').format('MM/DD/YYYY') + " "+ req.body.timeNeuro;
	//splitpoc = req.body.poc.slice(0,2);
	
	MasterNeuro.findOne({ neuroID: req.params.neuroID }).then(editNeuro => {
		editNeuro.date = moment(req.body.dateNeuro, 'DD/MM/YYYY').format('YYYY-MM-DD'),
		editNeuro.time = req.body.timeNeuro,
		editNeuro.datetime = datetime,
		editNeuro.siteOfInjury = req.body.siteOfInjury,
		editNeuro.colourLeft = req.body.leftColour,
		editNeuro.colourRight = req.body.rightColour,
		editNeuro.temperatureLeft = req.body.leftTemperature,
		editNeuro.temperatureRight = req.body.rightTemperature,
		editNeuro.capillaryRefillLeft = req.body.leftCapillaryRefill,
		editNeuro.capillaryRefillRight = req.body.rightCapillaryRefill,
		editNeuro.peripheralPulseLeft = req.body.leftPeripheralPulse,
		editNeuro.peripheralPulseRight = req.body.rightPeripheralPulse,
		editNeuro.edemaLeft = req.body.leftEdema,
		editNeuro.edemaRight = req.body.rightEdema,
		editNeuro.movementLeft = req.body.leftMovement,
		editNeuro.movementRight = req.body.rightMovement,
		editNeuro.sensationLeft = req.body.leftSensation,
		editNeuro.sensationRight = req.body.rightSensation,
		editNeuro.painScale = req.body.painScale,
		editNeuro.numericalRatingScaleLeft = req.body.numericalRatingScaleLeft,
		editNeuro.numericalRatingScaleRight = req.body.numericalRatingScaleRight,
		editNeuro.characteristicLeft = req.body.leftCharacteristic,
		editNeuro.characteristicRight = req.body.rightCharacteristic
		editNeuro.save();
	});
	res.redirect('/student/neuro/' + req.params.recordID);
})


//END OF Neurovascular

//Load Neurovascular page
router.get('/neuro/:recordID', ensureAuthenticated, (req, res) => {
	userType = req.user.userType == 'student';
	MasterNeuro.find({ patientID: req.params.recordID}).sort({'datetime':1}).then(newNeuro => {

		neurosample = [];
		neurosampleDate = [];
		let neuroFlow = Object.assign([], newNeuro);
		
		neuroCount = -1;
		
		neuronoRecord = 'No existing record';

		newNeuro.forEach(neuro => {
			if (!(neurosample.includes(neuro.datetime))) {
				neurosample.push(neuro.datetime);
				neurosampleDate.push(neuro.date);
			}
		});
		neurosample.sort();
		neurosampleDate.sort();

		for (i = 0; i < neurosample.length; i++) {
			

			//Counter for empty data
			//.length here refers to last index of the array
			if (neuroCount !== (neuroFlow.length - 1)) {
				neuroCount++;
			}
			//Insert empty data when value doesnt match
			//Count here does the index count of flow array
			if(neuroFlow !='') 
			{
				if (neurosample[i] < neuroFlow[neuroCount].datetime) {
					neuroFlow.splice(neuroCount, 0, {datetime: ''});
				} else if (neurosample[i] > neuroFlow[neuroCount].datetime) {
					neuroFlow.splice(neuroCount + 1, 0, {datetime: ''});
				}
			} 
			else
			{
				neuroFlow.push({datetime: '', poc: diabeticnoRecord});
			}

			
		};
		res.render('charts/master/charts-neuro', {
			recordID: req.params.recordID,
			userType: userType,
			neurodateVal: neurosample,
			neuroFlow: hbsSecurity.hbsFixArr(neuroFlow),
			newNeuro: hbsSecurity.hbsFixArr(newNeuro),
			patient: req.session.patient,
			showMenu: true
		})
	})
})

//get single Neurovascular info
router.get('/neuro/:recordID/:neuroID', ensureAuthenticated, (req, res) => {
	userType = req.user.userType == 'student';
	// MasterBraden.find({ patientID: req.session.patient.patientID }).then(newBraden => {
		MasterNeuro.find({ patientID: req.params.recordID }).sort({'datetime':1}).then(newNeuro => {
		MasterNeuro.findOne({ neuroID: req.params.neuroID }).then(editNeuro => {
			editNeuro.date = moment(editNeuro.date, 'YYYY-MM-DD').format('DD/MM/YYYY');
			res.render('charts/master/charts-neuro', {
				// azureId: req.user.azure_oid,
				recordID: req.params.recordID,
				userType: userType,
				newNeuro: hbsSecurity.hbsFixArr(newNeuro),
				//check neuro
				//editNeuro: hbsSecurity.hbsFix(editNeuro),
				editDiabetic: editDiabetic,
				patient: req.session.patient,
				showMenu: true			
			})
		})
	})
})
//add Neurovascular info
router.post('/add-neuro/:recordID', ensureAuthenticated, (req, res) => {
	neuroID = (new standardID('AAA0000')).generate();
	datetime = moment(req.body.dateNeuro, 'DD/MM/YYYY').format('MM/DD/YYYY') + " "+ req.body.timeNeuro;
	//splitpoc = req.body.poc.slice(0,2);


	new MasterNeuro({
			// patientID: req.session.patient.patientID,
			patientID: req.params.recordID,
			neuroID: neuroID,
			date: moment(req.body.dateNeuro, 'DD/MM/YYYY').format('YYYY-MM-DD'),
			datetime: datetime,
			time: req.body.timeNeuro,
			poc: req.body.poc,
			bgl:	req.body.bgl,
			insulintype: req.body.insulintype,
			insulinamt: req.body.insulinamt,
			hypoagent: req.body.hypoagent,
			//splitpoc: splitpoc,

	}).save();

	res.redirect('/student/neuro/'+req.params.recordID);
})

//Edit Neurovascular information
router.put('/edit-neuro/:recordID/:neuroID', ensureAuthenticated, (req,res) => {
	datetime = moment(req.body.dateNeuro, 'DD/MM/YYYY').format('MM/DD/YYYY') + " "+ req.body.timeNeuro;
	//splitpoc = req.body.poc.slice(0,2);
	
	MasterNeuro.findOne({ neuroID: req.params.neuroID }).then(editNeuro => {
		editNeuro.date = moment(req.body.dateNeuro, 'DD/MM/YYYY').format('YYYY-MM-DD'),
		editNeuro.time = req.body.timeNeuro,
		editNeuro.datetime = datetime,
		editNeuro.poc = req.body.poc,
		editNeuro.bgl = req.body.bgl,
		editNeuro.insulintype = req.body.insulintype,
		editNeuro.insulinamt = req.body.insulinamt,
		editNeuro.hypoagent = req.body.hypoagent,
		//editNeuro.splitpoc = splitpoc,

		editDiabetic.save();
	});
	res.redirect('/student/neuro/' + req.params.recordID);
})


//END OF Neurovascular


//Load clc page
router.get('/clc/:recordID', ensureAuthenticated, (req, res) => {
	userType = req.user.userType == 'student';
		MasterGcs.find({patientID: req.params.recordID}).sort({'datetime':1}).then(newGcs => {
			MasterClcVital.find({ patientID: req.params.recordID }).sort({'datetime':1}).then(newclcvital => {
				MasterPupils.find({ patientID: req.params.recordID }).sort({'datetime':1}).then(newpupils => {	
					MasterMotorStrength.find({ patientID: req.params.recordID }).sort({'datetime':1}).then(newmotorstrength => {						

						clcsample = [];
						clcsampleDate = [];
						let gcsFlow = Object.assign([], newGcs);
						let clcvitalFlow = Object.assign([], newclcvital);
						let pupilsFlow = Object.assign([], newpupils);
						let motorstrengthFlow = Object.assign([], newmotorstrength);
						gcsCount = -1;
						clcvitalCount = -1;
						pupilsCount = -1;
						motorstrengthCount = -1;
						ionoRecord = 'No existing record';
	
						newGcs.forEach(gcs => {
							if (!(clcsample.includes(gcs.datetime))) {
								clcsample.push(gcs.datetime);
								clcsampleDate.push(gcs.date);
							}
						});
						newclcvital.forEach(clcvital => {
							if (!(clcsample.includes(clcvital.datetime))) {
								clcsample.push(clcvital.datetime);
								clcsampleDate.push(clcvital.date);
							}
						});
						newpupils.forEach(pupils => {
							if (!(clcsample.includes(pupils.datetime))){
								clcsample.push(pupils.datetime);
								clcsampleDate.push(pupils.date);
							}
						});
	
						newmotorstrength.forEach(motorstrength => {
							if (!(clcsample.includes(motorstrength.datetime))) {
								clcsample.push(motorstrength.datetime);
								clcsampleDate.push(motorstrength.date);
							}
						});
			
							
						clcsample.sort();
						clcsampleDate.sort();
	
						for (i = 0; i < clcsample.length; i++) {
							
	
							//Counter for empty data
							//.length here refers to last index of the array
							if (gcsCount !== (gcsFlow.length - 1)) {
								gcsCount++;
							}
	
							if (clcvitalCount !== (clcvitalFlow.length - 1)) {
								clcvitalCount++;
							}
	
							if (pupilsCount !== (pupilsFlow.length - 1)) {
								pupilsCount++;
							}
	
							if (motorstrengthCount !== (motorstrengthFlow.length - 1)) {
								motorstrengthCount++;
							}
							
	
							//Insert empty data when value doesnt match
							//Count here does the index count of flow array
							if(gcsFlow !='') 
							{
								if (clcsample[i] < gcsFlow[gcsCount].datetime) {
									gcsFlow.splice(gcsCount, 0, {datetime: ''});
								} else if (clcsample[i] > gcsFlow[gcsCount].datetime) {
									gcsFlow.splice(gcsCount + 1, 0, {datetime: ''});
								}
							} 
							else
							{
								gcsFlow.push({datetime: '', eyeopen: ionoRecord});
							}
	
							if(clcvitalFlow !='') 
							{
								if (clcsample[i] < clcvitalFlow[clcvitalCount].datetime) {
									clcvitalFlow.splice(clcvitalCount, 0, {datetime: ''});
								} else if (clcsample[i] > clcvitalFlow[clcvitalCount].datetime) {
									clcvitalFlow.splice(clcvitalCount + 1, 0, {datetime: ''});
								}
							} 
							else
							{
								clcvitalFlow.push({datetime: '', heartRate: ionoRecord});
							}
	
							if(pupilsFlow !='') 
							{
								if (clcsample[i] < pupilsFlow[pupilsCount].datetime) {
									pupilsFlow.splice(pupilsCount, 0, {datetime: ''});
								} else if (clcsample[i] > pupilsFlow[pupilsCount].datetime) {
									pupilsFlow.splice(pupilsCount + 1, 0, {datetime: ''});
								}
							} 
							else 
							{
								pupilsFlow.push({datetime: '', sizeright: ionoRecord});
							}
	
							if(motorstrengthFlow !='')
							{
								if (clcsample[i] < motorstrengthFlow[motorstrengthCount].datetime) {
									motorstrengthFlow.splice(motorstrengthCount, 0, {datetime: ''});
								} else if (clcsample[i] > motorstrengthFlow[motorstrengthCount].datetime) {
									motorstrengthFlow.splice(motorstrengthCount + 1, 0, {datetime: ''});
								}
							}
							else 
							{
								motorstrengthFlow.push({datetime: '', splitstrengthrightarm: ionoRecord});
							}
						};
						userType = req.user.userType == 'student';
						if (req.user.userType == 'staff')
						{
							userType = 'student';
						}
						res.render('charts/master/charts-clc', {
							recordID: req.params.recordID,
							userType: userType,

							clcsampleDate: clcsample,
							gcsFlow: hbsSecurity.hbsFixArr(gcsFlow),
							clcvitalFlow: hbsSecurity.hbsFixArr(clcvitalFlow),
							pupilsFlow: hbsSecurity.hbsFixArr(pupilsFlow),
							motorstrengthFlow: hbsSecurity.hbsFixArr(motorstrengthFlow),
							newGcs: hbsSecurity.hbsFixArr(newGcs),
							newpupils: hbsSecurity.hbsFixArr(newpupils),
							newclcvital: hbsSecurity.hbsFixArr(newclcvital),
							newmotorstrength: hbsSecurity.hbsFixArr(newmotorstrength),
							patient: req.session.patient,
							currentUserType: req.user.userType,
							studentFirstName: req.session.firstNameAndEmail,
							showMenu: true
						})
					})
				})
			});
		})
	})

//get single gcs info
router.get('/clc-gcs/:recordID/:gcsID', ensureAuthenticated, (req, res) => {
	userType = req.user.userType == 'student';
	MasterGcs.find({ patientID: req.params.recordID }).sort({'datetime':1}).then(newGcs => {
		MasterGcs.findOne({ gcsID: req.params.gcsID }).then(editGcs => {

			editGcs.date = moment(editGcs.date, 'YYYY-MM-DD').format('DD/MM/YYYY');
			res.render('charts/master/charts-clc', {
				recordID: req.params.recordID,
				userType: userType,
				newGcs: hbsSecurity.hbsFixArr(newGcs),
				editGcs: hbsSecurity.hbsFix(editGcs),
				patient: req.session.patient,
				showMenu: true			
			})
		})
	})
})
//add gcs info
router.post('/add-gcs/:recordID', ensureAuthenticated, (req, res) => {
	gcsID = (new standardID('AAA0000')).generate();
	datetime = moment(req.body.dateGcs, 'DD/MM/YYYY').format('MM/DD/YYYY') + " " + req.body.timeGcs;
	
	totalgcs = parseInt(req.body.eyeopen.slice(-2))
	+ parseInt(req.body.bestverbal.slice(-2)) 
	+ parseInt(req.body.bestmotor.slice(-2));

	spliteyeopen = removeNumber.removeNumberFunction(req.body.eyeopen);
	splitbestverbal = removeNumber.removeNumberFunction(req.body.bestverbal);
	splitbestmotor = removeNumber.removeNumberFunction(req.body.bestmotor);
	
	new MasterGcs({
		patientID: req.params.recordID,
		gcsID: gcsID,
		date:	moment(req.body.dateGcs, 'DD/MM/YYYY').format('YYYY-MM-DD'),
		time: req.body.timeGcs,
		datetime: datetime,
		eyeopen: req.body.eyeopen,
		bestverbal: req.body.bestverbal,
		bestmotor: req.body.bestmotor,

		spliteyeopen:spliteyeopen,
		splitbestverbal:splitbestverbal,
		splitbestmotor:splitbestmotor,

		totalgcs: totalgcs,
	}).save();

	res.redirect('/student/clc/'+req.params.recordID);
})
//edit gcs informations
router.put('/edit-gcs/:recordID/:gcsID', ensureAuthenticated, (req,res) => {
	datetime = moment(req.body.dateGcs, 'DD/MM/YYYY').format('MM/DD/YYYY') + " " + req.body.timeGcs;

	totalgcs = parseInt(req.body.eyeopen.slice(-2))
	+ parseInt(req.body.bestverbal.slice(-2)) 
	+ parseInt(req.body.bestmotor.slice(-2));

	spliteyeopen = removeNumber.removeNumberFunction(req.body.eyeopen);
	splitbestverbal = removeNumber.removeNumberFunction(req.body.bestverbal);
	splitbestmotor = removeNumber.removeNumberFunction(req.body.bestmotor);

	MasterGcs.findOne({ gcsID: req.params.gcsID }).then(editGcs => {
		editGcs.date = moment(req.body.dateGcs, 'DD/MM/YYYY').format('YYYY-MM-DD'),
		editGcs.time = req.body.timeGcs,
		editGcs.datetime = datetime,
		editGcs.eyeopen = req.body.eyeopen,
		editGcs.bestverbal = req.body.bestverbal,
		editGcs.bestmotor = req.body.bestmotor,
		editGcs.totalgcs = totalgcs,

		editGcs.spliteyeopen = spliteyeopen,
		editGcs.splitbestverbal = splitbestverbal,
		editGcs.splitbestmotor = splitbestmotor,
		editGcs.save();
	});
	res.redirect('/student/clc/' + req.params.recordID);
})
//Delete gcs information
router.delete('/del-gcs/:recordID/:gcsID', ensureAuthenticated, (req, res) => {
	MasterGcs.deleteOne({gcsID: req.params.gcsID}, function(err) {
		if (err) {
			console.log('Cannot delete GCS details');
		}
	});
	res.redirect('/student/gcs/' + req.params.recordID);
})

//add clc vital info
router.post('/add-clcvital/:recordID', ensureAuthenticated, (req, res) => {
	clcvitalID = (new standardID('AAA0000')).generate();
	datetime = moment(req.body.dateclcvital, 'DD/MM/YYYY').format('MM/DD/YYYY') + " " + req.body.timeclcvital;

	bloodp = req.body.sbp + "/" + req.body.dbp;

	new MasterClcVital({
		patientID: req.params.recordID,
		clcvitalID: clcvitalID,
		date:	moment(req.body.dateclcvital, 'DD/MM/YYYY').format('YYYY-MM-DD'),
		time: req.body.timeclcvital,
		datetime: datetime,
		heartRate: req.body.heartRate,
		resp: req.body.resp,
		sbp: req.body.sbp,
		dbp: req.body.dbp,
		bloodp: bloodp,

	}).save();

	res.redirect('/student/clc/' + req.params.recordID);
})

//Delete clcvital information
router.delete('/del-clcvital/:recordID/:clcvitalID', ensureAuthenticated, (req, res) => {
	MasterClcVital.deleteOne({clcvitalID: req.params.clcvitalID}, function(err) {
		if (err) {
			console.log('cannot delete Vital details');
		}
	});
	res.redirect('/student/clc/' + req.params.recordID);
})

//Get single clcvital info
router.get('/clc-vital/:recordID/:clcvitalID', ensureAuthenticated, (req, res) => {
	userType = req.user.userType == 'student';
	MasterClcVital.find({ patientID: req.session.patient.patientID }).sort({'datetime':1}).then(newclcvital => {
		MasterClcVital.findOne({ clcvitalID: req.params.clcvitalID }).then(editclcvital => {

			//Changes date format to DD/MM/YYYY
			editclcvital.date = moment(editclcvital.date, 'YYYY-MM-DD').format('DD/MM/YYYY');
			res.render('charts/master/charts-clc', {
				recordID: req.params.recordID,
				userType: userType,
				newclcvital: hbsSecurity.hbsFixArr(newclcvital),
				editclcvital: hbsSecurity.hbsFix(editclcvital),
      		})
    	})
  	})
})


//Edit clcvital info
router.put('/edit-clcvital/:recordID/:clcvitalID', ensureAuthenticated, (req, res) => {
	datetime = moment(req.body.dateclcvital, 'DD/MM/YYYY').format('MM/DD/YYYY') + " " + req.body.timeclcvital;

	bloodp = req.body.sbp + "/" + req.body.dbp;

	MasterClcVital.findOne({ clcvitalID: req.params.clcvitalID }).then(editclcvital => {
		editclcvital.date = moment(req.body.dateclcvital, 'DD/MM/YYYY').format('YYYY-MM-DD'),
		editclcvital.time = req.body.timeclcvital,
		editclcvital.datetime = datetime,
		editclcvital.heartRate = req.body.heartRate,
		editclcvital.resp = req.body.resp,
		editclcvital.sbp = req.body.sbp,
		editclcvital.dbp = req.body.dbp,
		editclcvital.bloodp = bloodp,

		editclcvital.save();
	});
	res.redirect('/student/clc/' + req.params.recordID);
})

//add pupils info
router.post('/add-pupils/:recordID', ensureAuthenticated, (req, res) => {
	pupilsID = (new standardID('AAA0000')).generate();
	datetime = moment(req.body.datepupils, 'DD/MM/YYYY').format('MM/DD/YYYY') + " " + req.body.timepupils;

	new MasterPupils({
		patientID: req.params.recordID,
		pupilsID: pupilsID,
		date:	moment(req.body.datepupils, 'DD/MM/YYYY').format('YYYY-MM-DD'),
		time: req.body.timepupils,
		datetime: datetime,
		sizeright: req.body.sizeright,
		sizeleft: req.body.sizeleft,
		reactionright: req.body.reactionright,
		reactionleft: req.body.reactionleft,

	}).save();

	res.redirect('/student/clc/' +req.params.recordID);
})
//Delete pupils information
router.delete('/del-pupils/:recordID/:pupilsID', ensureAuthenticated, (req, res) => {
	MasterPupils.deleteOne({pupilsID: req.params.pupilsID}, function(err) {
		if (err) {
			console.log('cannot delete Pupils details');
		}
	});
	res.redirect('/student/clc/' + req.params.recordID);
})
//Get single pupils info
router.get('/clc-pupils/:recordID/:pupilsID', ensureAuthenticated, (req, res) => {
	userType = req.user.userType == 'student';
	MasterPupils.find({ patientID: req.session.patient.patientID }).sort({'datetime':1}).then(newpupils => {
		MasterPupils.findOne({ pupilsID: req.params.pupilsID }).then(editpupils => {

			//Changes date format to DD/MM/YYYY
			editpupils.date = moment(editpupils.date, 'YYYY-MM-DD').format('DD/MM/YYYY');
			res.render('charts/master/charts-clc', {
				recordID: req.params.recordID,
				userType: userType,
				newpupils: hbsSecurity.hbsFixArr(newpupils),
				editpupils: hbsSecurity.hbsFix(editpupils),
      		})
    	})
  	})
})

//Edit pupils info
router.put('/edit-pupils/:recordID/:pupilsID', ensureAuthenticated, (req, res) => {
	datetime = moment(req.body.datepupils, 'DD/MM/YYYY').format('MM/DD/YYYY') + " " + req.body.timepupils;

	MasterPupils.findOne({ pupilsID: req.params.pupilsID }).then(editpupils => {

		editpupils.date = moment(req.body.datepupils, 'DD/MM/YYYY').format('YYYY-MM-DD'),
		editpupils.time = req.body.timepupils,
		editpupils.datetime = datetime,
		editpupils.sizeright = req.body.sizeright,
		editpupils.sizeleft = req.body.sizeleft,
		editpupils.reactionright = req.body.reactionright,
		editpupils.reactionleft = req.body.reactionleft,

		editpupils.save();
	})
	res.redirect('/student/clc/' + req.params.recordID);
})

//add motorstrength info
router.post('/add-motorstrength/:recordID', ensureAuthenticated, (req, res) => {
	motorstrengthID = (new standardID('AAA0000')).generate();
	datetime = moment(req.body.datemotorstrength, 'DD/MM/YYYY').format('MM/DD/YYYY') + " " + req.body.timemotorstrength;
	
	totalms = parseInt(req.body.strengthrightarm.slice(-2))
	+ parseInt(req.body.strengthleftarm.slice(-2)) 
	+ parseInt(req.body.strengthrightleg.slice(-2))
	+ parseInt(req.body.strengthleftleg.slice(-2));

	splitstrengthrightarm = removeNumber.removeNumberFunction(req.body.strengthrightarm);
	splitstrengthleftarm = removeNumber.removeNumberFunction(req.body.strengthleftarm);
	splitstrengthrightleg = removeNumber.removeNumberFunction(req.body.strengthrightleg);
	splitstrengthleftleg = removeNumber.removeNumberFunction(req.body.strengthleftleg);
	new MasterMotorStrength({
		patientID: req.params.recordID,
		motorstrengthID: motorstrengthID,
		date:	moment(req.body.datemotorstrength, 'DD/MM/YYYY').format('YYYY-MM-DD'),
		time: req.body.timemotorstrength,
		datetime: datetime,
		strengthrightarm: req.body.strengthrightarm,
		strengthleftarm: req.body.strengthleftarm,
		strengthrightleg: req.body.strengthrightleg,
		strengthleftleg: req.body.strengthleftleg,

		splitstrengthrightarm: splitstrengthrightarm,
		splitstrengthleftarm: splitstrengthleftarm,
		splitstrengthrightleg: splitstrengthrightleg,
		splitstrengthleftleg: splitstrengthleftleg,
		
		totalms: totalms,

	}).save();

	res.redirect('/student/clc/'+ req.params.recordID);
})
//Delete motor strength information
router.delete('/del-motorstrength/:recordID/:motorstrengthID', ensureAuthenticated, (req, res) => {
	MasterMotorStrength.deleteOne({motorstrengthID: req.params.motorstrengthID}, function(err) {
		if (err) {
			console.log('Cannot delete Motor Strength details');
		}
	});
	res.redirect('/student/clc/' + req.params.recordID);
})

//Get single motorstrength info
router.get('/clc-motorstrength/:recordID/:motorstrengthID', ensureAuthenticated, (req, res) => {
	userType = req.user.userType == 'student';
	MasterMotorStrength.find({ patientID: req.session.patient.patientID }).sort({'datetime':1}).then(newmotorstrength => {
		MasterMotorStrength.findOne({ motorstrengthID: req.params.motorstrengthID }).then(editmotorstrength => {

			//Changes date format to DD/MM/YYYY
			editmotorstrength.date = moment(editmotorstrength.date, 'YYYY-MM-DD').format('DD/MM/YYYY');
			res.render('charts/master/charts-clc', {
				recordID: req.params.recordID,
				userType: userType,
				newmotorstrength: hbsSecurity.hbsFixArr(newmotorstrength),
				editmotorstrength: hbsSecurity.hbsFix(editmotorstrength),
				patient: req.session.patient,
				showMenu: true	
      		})
    	})
  	})
})

//Edit motorstrength info
router.put('/edit-motorstrength/:recordID/:motorstrengthID', ensureAuthenticated, (req, res) => {
	datetime = moment(req.body.datemotorstrength, 'DD/MM/YYYY').format('MM/DD/YYYY') + " " + req.body.timemotorstrength;
	
	totalms = parseInt(req.body.strengthrightarm.slice(-2))
	+ parseInt(req.body.strengthleftarm.slice(-2)) 
	+ parseInt(req.body.strengthrightleg.slice(-2))
	+ parseInt(req.body.strengthleftleg.slice(-2));

	splitstrengthrightarm = removeNumber.removeNumberFunction(req.body.strengthrightarm);
	splitstrengthleftarm = removeNumber.removeNumberFunction(req.body.strengthleftarm);
	splitstrengthrightleg = removeNumber.removeNumberFunction(req.body.strengthrightleg);
	splitstrengthleftleg = removeNumber.removeNumberFunction(req.body.strengthleftleg);

	MasterMotorStrength.findOne({ motorstrengthID: req.params.motorstrengthID }).then(editmotorstrength => {

		editmotorstrength.date = moment(req.body.datemotorstrength, 'DD/MM/YYYY').format('YYYY-MM-DD'),
		editmotorstrength.time = req.body.timemotorstrength,
		editmotorstrength.datetime = datetime,
		editmotorstrength.strengthrightarm = req.body.strengthrightarm,
		editmotorstrength.strengthleftarm = req.body.strengthleftarm,
		editmotorstrength.strengthrightleg = req.body.strengthrightleg,
		editmotorstrength.strengthleftleg = req.body.strengthleftleg,
		editmotorstrength.totalms = totalms,

		editmotorstrength.splitstrengthrightarm = splitstrengthrightarm,
		editmotorstrength.splitstrengthleftarm = splitstrengthleftarm,
		editmotorstrength.splitstrengthrightleg = splitstrengthrightleg,
		editmotorstrength.splitstrengthleftleg = splitstrengthleftleg,

		editmotorstrength.save();
	})
	res.redirect('/student/clc/' + req.params.recordID);
})
//END OF clc

router.get('/FeedingRegime/:recordID', ensureAuthenticated, (req, res) => {

	//DoctorOrders.find({ patientID: req.params.recordID }).sort({'datetime':1}).then(docOrders => {
	MasterFeedingRegime.find({ patientID: req.session.patient.patientID })
	.sort({'datetime': 1}).then(newFeeding => {
		// MasterScheduleFeed.findOne({ masterpatientID: req.session.patient.patientID})
		MasterScheduleFeed.find({ masterpatientID: req.session.patient.patientID, patientID: req.params.recordID})
		.sort({'date': -1, 'time': 1}).then(newOtherScheduleFeed =>{

			var schedFlowLength = 0;
			
			schedFlowLength = schedFlowLength * 2;

			schedsample = [];
			schedsampleDate = [];

			let schedFlow = Object.assign([], newOtherScheduleFeed);//all the records
			schedCount = -1;
			schednoRecord = 'No existing record';

			var finalDate = [];
		
			newOtherScheduleFeed.forEach(sched => {
			if (!(schedsample.includes(sched.datetime))) {
				schedsample.push(sched.datetime);
				schedsampleDate.push(sched.date);
			}
				if (!(schedsample.includes(sched.datetime))) {
					schedsample.push(sched.datetime);
					schedsampleDate.push(sched.date);
				}
			});

			schedsample.sort();
			schedsampleDate.sort();
			
			for (i = 0; i < finalDate.length; i++) {
				
				//Counter for empty data
				//.length here refers to last index of the array
				if (schedCount !== (finalDate.length - 1)) {
					//console.log("Schedule count: " + schedCount);
					//console.log("Schedule Length: " + (finalDate));
					schedCount++;
				}
				if(schedFlow != '') 
				{
					if (schedsample[i] < schedFlow[schedCount].datetime) {
						
						schedFlow.splice(schedCount, 0, {datetime: ''});

					} else if (schedsample[i] > schedFlow[schedCount].datetime) {
						schedFlow.splice(schedCount + 1, 0, {datetime: ''});
					}
				} 
				else
				{
					schedFlow.push({datetime: '', scheduleFeed: schednoRecord});
				}
			};

			userType = req.user.userType == 'student';
			if (req.user.userType == 'staff')
			{
				userType = 'student';
			}
			//console.log("Schedule Date Value: " + schedsampleDate);//schedsample is date and time
			// console.log("Schedule Flow:"+ schedFlow);//schedFlow is the records 
			res.render('charts/master/charts-feeding-regime', {
			
				recordID: req.params.recordID,
				newOtherScheduleFeed: hbsSecurity.hbsFixArr(newOtherScheduleFeed),
				userType: userType,
				currentUserType: req.user.userType,
				studentFirstName: req.session.firstNameAndEmail,
				newFeeding: hbsSecurity.hbsFixArr(newFeeding),
				schedRowspan : schedFlowLength,
				currentName: req.user.firstName,
				patient: req.session.patient,
				scheddateVal: schedsample,
				finalDate: finalDate.length - 1,
				schedFlow: hbsSecurity.hbsFixArr(schedFlow),
				showMenu: true
			})
		})
	})
})
//One Feeding Regime by ID
router.get('/FeedingRegime/:recordID/:feedID/:name', ensureAuthenticated, (req,res) => {
	
		userType = req.user.userType == 'student';

		if (req.user.userType == 'staff')
		{ 
			userType = 'student';

			PatientStudentModel.findOne({recordID: req.params.recordID})
			.then(patientStudent => {
				MasterFeedingRegime.find({patientID: req.session.patient.patientID, user:{'$ne': patientStudent.user}})
				.then(newFeeding => {
					MasterFeedingRegime.findOne({  masterpatientID: req.session.patient.patientID, user: patientStudent.user})
					.then(newOtherFeeding =>{
						
						MasterFeedingRegime.findOne({ feedID: req.params.feedID })
						.then(editFeeding =>{
							
							//console.log("Edit Feeding: "+ editFeeding);

							var name = req.params.name;
							res.render('charts/master/charts-feeding-regime',{
								newFeeding: hbsSecurity.hbsFixArr(newFeeding),
								editFeeding: hbsSecurity.hbsFix(editFeeding),
								patient: req.session.patient,
								userType: userType,
								recordID: req.params.recordID,
								newOtherFeeding: hbsSecurity.hbsFix(newOtherFeeding),
								currentName: req.user.firstName,
								by: name,
								checkifEmpty: false,
								currentUserType: req.user.userType,
								showMenu: true
							})
						
						});
					});
				});
			});
		}
		else
		{
			MasterFeedingRegime.find({patientID: req.session.patient.patientID, user:{'$ne': req.user._id}})
			.then(newFeeding => {
				MasterFeedingRegime.findOne({ feedID: req.params.feedID })
				.then(editFeeding =>{
					
					MasterFeedingRegime.findOne({ masterpatientID: req.session.patient.patientID, user: req.user._id})
					.then(newOtherFeeding =>{
						MasterScheduleFeed.findOne({ scheduleID: req.params.scheduleID})
						.then(editSchedule =>{

						var name = req.params.name;
							res.render('charts/master/charts-feeding-regime',{
								newFeeding: hbsSecurity.hbsFixArr(newFeeding),
								editFeeding: hbsSecurity.hbsFix(editFeeding),
								editSchedule: hbsSecurity.hbsFix(editSchedule),
								patient: req.session.patient,
								userType: userType,
								currentName: req.user.firstName,
								newOtherFeeding: hbsSecurity.hbsFix(newOtherFeeding),
								recordID: req.params.recordID,
								by: name,
								checkifEmpty: false,
								currentUserType: req.user.userType,
								showMenu: true
							})
						})
					})
				});
			});
		}
})
//Edit the Feeding Regime
router.put('/edit-feeding-regime/:recordID/:feedID/:name', ensureAuthenticated, (req,res) => {
	datetime = moment(req.body.dateFeeding, 'DD/MM/YYYY').format('MM/DD/YYYY') + " " + req.body.timeFeeding;

	MasterFeedingRegime.findOne({masterpatientID: req.session.patient.patientID, feedID: req.params.feedID}).then(editFeeding => {
		
		editFeeding.typeofFormula = req.body.typeofFormula,
		editFeeding.enteralFeed = req.body.enteralFeed,
		editFeeding.date = moment(req.body.dateFeeding, 'DD/MM/YYYY').format('YYYY-MM-DD'),
		editFeeding.time = req.body.timeFeeding,
		editFeeding.datetime = datetime,

		editFeeding.save();
	});
	res.redirect("/student/FeedingRegime/" + req.params.recordID);
})

//Schedule Feeding

//Add Schedule

router.post('/add-schedule/:recordID', ensureAuthenticated, (req, res) => {
	scheduleID = (new standardID('AAA0000')).generate();
	datetime = moment(req.body.dateSchedule, 'DD/MM/YYYY').format('MM/DD/YYYY') + " " + req.body.timeSchedule;
	new MasterScheduleFeed({
		user: req.user.id,
		by: req.user.firstName,
		patientID: req.params.recordID,
		date: moment(req.body.dateSchedule, 'DD/MM/YYYY').format('YYYY-MM-DD'),
		time: req.body.timeSchedule,
		datetime: datetime,
		masterpatientID: req.session.patient.patientID,
		scheduleFeed: req.body.scheduleFeed,
		scheduleAmt: req.body.scheduleAmt,
		scheduleFlush: req.body.scheduleFlush,
		schedcomments: req.body.schedcomments,
		scheduleID: scheduleID
	}).save();
	res.redirect('/student/FeedingRegime/' + req.params.recordID );
})

//One Schedule by ID
router.get('/ScheduleFeeding/:recordID/:scheduleID/:name', ensureAuthenticated, (req,res) => {
	
		userType = req.user.userType == 'student';

		if (req.user.userType == 'staff')
		{ 
			userType = 'student';

			PatientStudentModel.findOne({recordID: req.params.recordID})
			.then(patientStudent => {
					
					MasterScheduleFeed.find({  masterpatientID: req.session.patient.patientID, user: patientStudent.user})
					.sort({'date': -1, 'time': 1}).then(newOtherScheduleFeed =>{
						
						MasterScheduleFeed.findOne({ scheduleID: req.params.scheduleID })
						.then(editSchedule =>{
							
							editSchedule.date = moment(editSchedule.date, 'YYYY-MM-DD').format('DD/MM/YYYY');

							var name = req.params.name;
							res.render('charts/master/charts-feeding-regime',{
								editSchedule: hbsSecurity.hbsFix(editSchedule),
								patient: req.session.patient,
								userType: userType,
								recordID: req.params.recordID,
								newOtherScheduleFeed: hbsSecurity.hbsFixArr(newOtherScheduleFeed),
								currentName: req.user.firstName,
								currentUserType: req.user.userType,
								by: name,
								checkifEmpty: false,
								currentUserType: req.user.userType,
								showMenu: true
							})
						
						});
					});
				// });
			});
		}
		else
		{
				PatientStudentModel.findOne({recordID: req.params.recordID})
				.then(patientStudent => {
				MasterScheduleFeed.find({ masterpatientID: req.session.patient.patientID, patientID: req.params.recordID})
				.sort({'date': -1, 'time': 1}).then(newOtherScheduleFeed =>{
					MasterScheduleFeed.findOne({ scheduleID: req.params.scheduleID, patientID: req.params.recordID })
					.then(editSchedule =>{
					
					editSchedule.date = moment(editSchedule.date, 'YYYY-MM-DD').format('DD/MM/YYYY');
					var name = req.params.name;
					res.render('charts/master/charts-feeding-regime',{
						editSchedule: hbsSecurity.hbsFix(editSchedule),
						patient: req.session.patient,
						userType: userType,
						currentName: req.user.firstName,
						newOtherScheduleFeed: hbsSecurity.hbsFixArr(newOtherScheduleFeed),
						recordID: req.params.recordID,
						currentUserType: req.user.userType,
						by: name,
						checkifEmpty: false,
						currentUserType: req.user.userType,
						showMenu: true
					})
				})
			})
		});
	}
})

//Edit the Schedule
router.put('/edit-schedule/:recordID/:scheduleID/:name', ensureAuthenticated, (req,res) => {
	datetime = moment(req.body.dateSchedule, 'DD/MM/YYYY').format('MM/DD/YYYY') + " " + req.body.timeSchedule;

	MasterScheduleFeed.findOne({scheduleID: req.params.scheduleID})
	.then(editSchedule => {
		editSchedule.date = moment(req.body.dateSchedule, 'DD/MM/YYYY').format('YYYY-MM-DD'),
		editSchedule.time = req.body.timeSchedule,
		editSchedule.datetime = datetime,
		editSchedule.scheduleFeed = req.body.scheduleFeed,
		editSchedule.scheduleAmt = req.body.scheduleAmt,
		editSchedule.scheduleFlush = req.body.scheduleFlush,
		editSchedule.schedcomments = req.body.schedcomments,

		editSchedule.save();
	});
	res.redirect("/student/FeedingRegime/" + req.params.recordID);
})

// Discharge Planning
router.get('/DischargePlanning/:recordID', ensureAuthenticated, (req, res) => {
	
	userType = req.user.userType == 'student';

	if (req.user.userType == 'staff')
	{
		userType = 'student';
	}

	//==================================================================================
	StudentDischargePlanning.find({patientID: req.params.recordID}).sort({'datetime':1})
	.then(newDischargePlanning => { // discharge planning that they have created
		StudentAppointment.find({patientID: req.params.recordID}).sort({'datetime':1})
		.then(newAppointment => {
			
			dischargeplanningsample = [];
			dischargeplanningsampleDate = [];
			let dischargePlanningFlow = Object.assign([], newDischargePlanning);
			let appointmentFlow = Object.assign([], newAppointment);

			dischargePlanningCount = -1;
			//appointmentCount = -1;

			dischargeplanningnoRecord = 'No existing record';

			newDischargePlanning.forEach(dischargeplanning => {
				if (!(dischargeplanningsample.includes(dischargeplanning.datetime))) {
					dischargeplanningsample.push(dischargeplanning.datetime);
					dischargeplanningsampleDate.push(dischargeplanning.date);
				}
			});

			// newAppointment.forEach(appointment => {
			// 	if (!(dischargeplanningsample.includes(appointment.datetime))){
			// 		dischargeplanningsample.push(appointment.datetime);
			// 		dischargeplanningsampleDate.push(appointment.date);
			// 	}
			// });

			let appointmentObj = {}; // sorting appointment based on dates
			
      		appointmentFlow.forEach((element) => {
        		const date = element.datetime.split(' ')[0];
				if (appointmentObj[date]) {
				
					appointmentObj[date].push(element);
				} else {
					appointmentObj[date] = [element];
				}
      		})
			console.log(JSON.stringify(appointmentObj));
				
			dischargeplanningsample.sort();
			dischargeplanningsampleDate.sort();

			for (i = 0; i < dischargeplanningsample.length; i++) {
				

				//Counter for empty data
				//.length here refers to last index of the array
				if (dischargePlanningCount !== (dischargePlanningFlow.length - 1)) {
					dischargePlanningCount++;
				}

				// if (appointmentCount !== (appointmentFlow.length - 1)) {
				// 	appointmentCount++;
				// }	

				//Insert empty data when value doesnt match
				//Count here does the index count of flow array
				if(dischargePlanningFlow !='') 
				{
					if (dischargeplanningsample[i] < dischargePlanningFlow[dischargePlanningCount].datetime) {
						dischargePlanningFlow.splice(dischargePlanningCount, 0, {datetime: ''});
					} else if (dischargeplanningsample[i] > dischargePlanningFlow[dischargePlanningCount].datetime) {
						dischargePlanningFlow.splice(dischargePlanningCount + 1, 0, {datetime: ''});
					}
				} 
				else
				{
					dischargePlanningFlow.push({datetime: '', dischargePlan: dischargeplanningnoRecord});
				}

				// if(appointmentFlow !='') 
				// {
				// 	if (dischargeplanningsample[i] < appointmentFlow[appointmentCount].datetime) {
				// 		appointmentFlow.splice(appointmentCount, 0, {datetime: ''});
				// 	} else if (dischargeplanningsample[i] > appointmentFlow[appointmentCount].datetime) {
				// 		appointmentFlow.splice(appointmentCount + 1, 0, {datetime: ''});
				// 	}
				// } 
				// else
				// {
				// 	appointmentFlow.push({datetime: '', clinic: dischargeplanningnoRecord});
				// }

			};

			res.render('discharge-planning/student/discharge-planning', {
				dischargePlanningdateVal: dischargeplanningsample,
				dischargePlanningFlow: hbsSecurity.hbsFixArr(dischargePlanningFlow),
				// appointmentFlow: appointmentFlow,
				newDischargePlanning: hbsSecurity.hbsFixArr(newDischargePlanning),
				newAppointment: hbsSecurity.hbsFixArr(newAppointment),
				appointmentObj: hbsSecurity.hbsFixArr(appointmentObj),
				patient: req.session.patient,
				recordID: req.params.recordID,
				userType: userType,
				currentUserType: req.user.userType,
				studentFirstName: req.session.firstNameAndEmail,
				showMenu: true			
			})
		})
	})
})

// Add Discharge Planning Record
router.post('/add-discharge-planning/:recordID', ensureAuthenticated, (req, res) => {

	datetime = moment(req.body.dateDischargePlanning, 'DD/MM/YYYY').format('MM/DD/YYYY') + " " + req.body.timeDischargePlanning;
	dischargePlanningID = (new standardID('AAA0000')).generate();
	new StudentDischargePlanning({
		patientID: req.params.recordID,
		dischargePlanningID: dischargePlanningID,
		datetime: datetime,
		date: moment(req.body.dateDischargePlanning, 'DD/MM/YYYY').format('YYYY-MM-DD'),
		time: req.body.timeDischargePlanning,
		// 1
		dischargePlan: req.body.dischargePlan,
		dischargeCondition: req.body.dischargeCondition,
		// 2
		dischargeTo: req.body.dischargeTo,
		dischargeToSpecify: req.body.dischargeToSpecify,
		// 3
		accompaniedBy: req.body.accompaniedBy,
		accompaniedBySpecify: req.body.accompaniedBySpecify,
		// 4
		modeOfTransport: req.body.modeOfTransport,
		modeOfTransportSpecify: req.body.modeOfTransportSpecify,
		// 5
		removalOf: req.body.removalOf,
		// 6
		checkedAndReturned: req.body.checkedAndReturned,
		checkedAndReturnedAppliancesSpecify: req.body.checkedAndReturnedAppliancesSpecify,
		checkedAndReturnedSpecify: req.body.checkedAndReturnedSpecify,
		// 7
		adviceGivenOn: req.body.adviceGivenOn,
		// Others Specify
		othersSpecify: req.body.othersSpecify,
		// Referrals
		referrals: req.body.referrals,
		referralsSpecify: req.body.referralsSpecify,
		// Medical Cert No
		medicalCertificateNo: req.body.medicalCertificateNo,
		// specifyInstructions
		specifyInstructions: req.body.specifyInstructions
	}).save();

	res.redirect('/student/DischargePlanning/'+ req.params.recordID);
});

// get single Discharge Planning info
router.get('/DischargePlanning/:recordID/:dischargePlanningID', ensureAuthenticated, (req, res) => {
	
	userType = req.user.userType == 'student';


	if (req.user.userType == 'staff')
	{

		userType = 'student';
		
		StudentDischargePlanning.find({patientID: req.params.recordID}).sort({'datetime':1})
		.then(newDischargePlanning => {
			StudentDischargePlanning.findOne({dischargePlanningID: req.params.dischargePlanningID})
			.then(editDischargePlanning => {
				editDischargePlanning.date = moment(editDischargePlanning.date, 'YYYY-MM-DD').format('DD/MM/YYYY');
				
				if (editDischargePlanning.appointmentDate == "Invalid date") {
					editDischargePlanning.appointmentDate = "";
				}
				else {
					editDischargePlanning.appointmentDate = moment(editDischargePlanning.appointmentDate , 'YYYY-MM-DD').format('DD/MM/YYYY');
				}

				res.render('discharge-planning/student/discharge-planning', {
					editDischargePlanning: hbsSecurity.hbsFix(editDischargePlanning),
					newDischargePlanning: hbsSecurity.hbsFixArr(newDischargePlanning),
					recordID: req.params.recordID,
					patient: req.session.patient,
					userType: userType,
					currentUserType: req.user.userType,
					studentFirstName: req.session.firstNameAndEmail,
					showMenu: true
				});
			})
		});
	}
	else
	{
		StudentDischargePlanning.find({patientID: req.params.recordID}).sort({'datetime':1})
		.then(newDischargePlanning => {
			StudentDischargePlanning.findOne({dischargePlanningID: req.params.dischargePlanningID})
			.then(editDischargePlanning => {
				editDischargePlanning.date = moment(editDischargePlanning.date, 'YYYY-MM-DD').format('DD/MM/YYYY');
				
				if (editDischargePlanning.appointmentDate == "Invalid date") {
					editDischargePlanning.appointmentDate = "";
				}
				else {
					editDischargePlanning.appointmentDate = moment(editDischargePlanning.appointmentDate , 'YYYY-MM-DD').format('DD/MM/YYYY');
				}
				res.render('discharge-planning/student/discharge-planning', {
					editDischargePlanning: hbsSecurity.hbsFix(editDischargePlanning),
					newDischargePlanning: hbsSecurity.hbsFixArr(newDischargePlanning),
					recordID: req.params.recordID,
					patient: req.session.patient,
					userType: userType,
					showMenu: true
				});
			})
		});
	}
	
});

// edit Discharge Planning
router.put('/edit-DischargePlanning/:recordID/:dischargePlanningID', ensureAuthenticated, (req,res) => {
	datetime = moment(req.body.dateDischargePlanning, 'DD/MM/YYYY').format('MM/DD/YYYY') + " " + req.body.timeDischargePlanning;

	StudentDischargePlanning.findOne({ dischargePlanningID: req.params.dischargePlanningID}).then(editDischargePlanning => {
		editDischargePlanning.date = moment(req.body.dateDischargePlanning, 'DD/MM/YYYY').format('YYYY-MM-DD'),
		editDischargePlanning.time = req.body.timeDischargePlanning,
		editDischargePlanning.datetime = datetime,
		// 1
		editDischargePlanning.dischargePlan = req.body.dischargePlan,
		editDischargePlanning.dischargeCondition = req.body.dischargeCondition,
		// 2
		editDischargePlanning.dischargeTo = req.body.dischargeTo,
		editDischargePlanning.dischargeToSpecify = req.body.dischargeToSpecify,
		// 3
		editDischargePlanning.accompaniedBy = req.body.accompaniedBy,
		editDischargePlanning.accompaniedBySpecify = req.body.accompaniedBySpecify,
		// 4
		editDischargePlanning.modeOfTransport = req.body.modeOfTransport,
		editDischargePlanning.modeOfTransportSpecify = req.body.modeOfTransportSpecify,
		// 5
		editDischargePlanning.removalOf = req.body.removalOf,
		// 6
		editDischargePlanning.checkedAndReturned = req.body.checkedAndReturned,
		editDischargePlanning.checkedAndReturnedAppliancesSpecify = req.body.checkedAndReturnedAppliancesSpecify,
		editDischargePlanning.checkedAndReturnedSpecify = req.body.checkedAndReturnedSpecify,
		// 7
		editDischargePlanning.adviceGivenOn = req.body.adviceGivenOn,
		// Others
		editDischargePlanning.othersSpecify = req.body.othersSpecify,
		// Referrals
		editDischargePlanning.referrals = req.body.referrals,
		editDischargePlanning.referralsSpecify = req.body.referralsSpecify,
		// Medical Cert No
		editDischargePlanning.medicalCertificateNo = req.body.medicalCertificateNo,
		// specifyInstructions
		editDischargePlanning.specifyInstructions = req.body.specifyInstructions

		editDischargePlanning.save();
	});
	res.redirect("/student/DischargePlanning/"+req.params.recordID);
})

// Add Appointment
router.post('/add-appointment/:recordID', ensureAuthenticated, (req, res) => {

	datetime = moment(req.body.appointmentDate1, 'DD/MM/YYYY').format('MM/DD/YYYY') + " " + req.body.appointmentTime1;
	appointmentID = (new standardID('AAA0000')).generate();
	new StudentAppointment({
		patientID: req.params.recordID,
		appointmentID: appointmentID,
		datetime: datetime,
		date: moment(req.body.appointmentDate1, 'DD/MM/YYYY').format('YYYY-MM-DD'),
		time: req.body.appointmentTime1,
		// Follow-up Appointment
		followUpAppointment: req.body.followUpAppointment1,
		followUpAppointmentSpecify: req.body.followUpAppointmentSpecify1,
		clinic: req.body.clinic1,
		nameOfDoctor: req.body.nameOfDoctor1,
		memoGiven: req.body.memoGiven1,
		remarks: req.body.remarks1,
	}).save();

	res.redirect('/student/DischargePlanning/'+ req.params.recordID);
});

// get single appointment
router.get('/FollowUpAppointment/:recordID/:appointmentID', ensureAuthenticated, (req, res) => {
	
	userType = req.user.userType == 'student';

	if (req.user.userType == 'staff')
	{

		userType = 'student';
		
		
		StudentAppointment.find({patientID: req.params.recordID}).sort({'datetime':1})
		.then(newAppointment => {
			StudentAppointment.findOne({appointmentID: req.params.appointmentID})
			.then(editAppointment => {
				
				editAppointment.date = moment(editAppointment.date, 'YYYY-MM-DD').format('DD/MM/YYYY');

				res.render('discharge-planning/student/discharge-planning', {
					editAppointment: hbsSecurity.hbsFix(editAppointment),
					newAppointment: hbsSecurity.hbsFixArr(newAppointment),
					recordID: req.params.recordID,
					patient: req.session.patient,
					userType: userType,
					currentUserType: req.user.userType,
					showMenu: true
				});
			})
		});
	}
	else
	{
		StudentAppointment.find({patientID: req.params.recordID}).sort({'datetime':1})
		.then(newAppointment => {
			StudentAppointment.findOne({appointmentID: req.params.appointmentID})
			.then(editAppointment => {
				editAppointment.date = moment(editAppointment.date, 'YYYY-MM-DD').format('DD/MM/YYYY');
				res.render('discharge-planning/student/discharge-planning', {
					editAppointment: hbsSecurity.hbsFix(editAppointment),
					newAppointment: hbsSecurity.hbsFixArr(newAppointment),
					recordID: req.params.recordID,
					patient: req.session.patient,
					userType: userType,
					showMenu: true
				});
			})
		});
	}
	
});

// edit Appointment
router.put('/edit-Appointment/:recordID/:appointmentID', ensureAuthenticated, (req,res) => {
	datetime = moment(req.body.appointmentDate1, 'DD/MM/YYYY').format('MM/DD/YYYY') + " " + req.body.appointmentTime1;

	StudentAppointment.findOne({ appointmentID: req.params.appointmentID}).then(editAppointment => {
		editAppointment.date = moment(req.body.appointmentDate1, 'DD/MM/YYYY').format('YYYY-MM-DD')
		editAppointment.time = req.body.appointmentTime1,
		editAppointment.datetime = datetime,

		editAppointment.followUpAppointment = req.body.followUpAppointment1,
		editAppointment.followUpAppointmentSpecify = req.body.followUpAppointmentSpecify1,
		editAppointment.clinic = req.body.clinic1,
		editAppointment.nameOfDoctor = req.body.nameOfDoctor1,
		editAppointment.memoGiven = req.body.memoGiven1,
		editAppointment.remarks = req.body.remarks1,

		editAppointment.save();
	});
	res.redirect("/student/DischargePlanning/"+req.params.recordID);
})

router.get('/mna/:recordID', ensureAuthenticated, (req, res) => {
	userType = req.user.userType == 'student';
	MasterMNA.find({ patientID: req.params.recordID }).then(newMNA => {

		userType = req.user.userType == 'student';
		if (req.user.userType == 'staff')
		{
			userType = 'student';
		}

		res.render('charts/master/charts-mna', {
			recordID: req.params.recordID,
			userType: userType,
			newMNA: hbsSecurity.hbsFixArr(newMNA),
			patient: req.session.patient,
			currentUserType: req.user.userType,
			showMenu: true
		});
	});
});

router.get('/mna/:recordID/:mnaID', ensureAuthenticated, (req, res) => {
	userType = req.user.userType == 'student';
	MasterMNA.find({ patientID: req.params.recordID }).then(newMNA => {
		MasterMNA.findOne({ mnaID: req.params.mnaID }).then(editMNA => {
			res.render('charts/master/charts-mna', {
				recordID: req.params.recordID,
				userType: userType,
				newMNA: hbsSecurity.hbsFixArr(newMNA),
				editMNA: hbsSecurity.hbsFix(editMNA),
				patient: req.session.patient,
				showMenu: true
			});
		});
	});
})

router.post('/add-mna1/:recordID', ensureAuthenticated, (req, res) => {
	mnaID = (new standardID('AAA0000')).generate();
	datetime = moment(req.body.dateMna, 'DD/MM/YYYY').format('MM/DD/YYYY') + " ";

		total = parseInt(req.body.foodIntake.slice(-1)) 
			+ parseInt(req.body.weightLoss.slice(-1)) 
			+ parseInt(req.body.mobility.slice(-1))
			+ parseInt(req.body.psych.slice(-1)) 
			+ parseInt(req.body.neuroPsych.slice(-1)) 
			+ parseInt(req.body.BMI.slice(-1))

		foodIntake = removeNumber.removeNumberFunction(req.body.foodIntake);
		weightLoss = removeNumber.removeNumberFunction(req.body.weightLoss);
		mobility = removeNumber.removeNumberFunction(req.body.mobility);
		psych = removeNumber.removeNumberFunction(req.body.psych);
 		neuroPsych = removeNumber.removeNumberFunction(req.body.neuroPsych);

		new MasterMNA({
			patientID: req.params.recordID,
			mnaID: mnaID,
			date: req.body.dateMna,
			time: req.body.timeMNA,
			datetime: datetime,
			foodIntake: foodIntake,
			weightLoss: weightLoss,
			mobility: mobility,
			psych: psych,
			neuroPsych: neuroPsych,
			BMI: req.body.BMI,
			screenScore: total,

			foodIntakefull: req.body.foodIntake,
			weightLossfull: req.body.weightLoss,
			mobilityfull: req.body.mobility,
			psychfull: req.body.psych,
			neuroPsychfull: req.body.neuroPsych,

			totalScore: total
	
		}).save();

	res.redirect('/student/mna/'+req.params.recordID);
});

router.post('/add-mna2/:recordID', ensureAuthenticated, (req, res) => {
	mnaID = (new standardID('AAA0000')).generate();
	datetime = moment(req.body.dateMNA2, 'DD/MM/YYYY').format('MM/DD/YYYY') + " ";

	function extractNo(str) {
        var matches = str.match(/\d+\.?\d*/);

        if (matches) {
            return matches[0]
        }
	}
	
	function calcProteinIntake() {
		var dairy = req.body.dairy;
		var eggs = req.body.eggs;
		var meats = req.body.meats;

		let myArray = [dairy, eggs, meats];

		//checks for no of occurence in array 
		function getOccurence(array, value) {
			var i = 0;
			array.forEach((v) => (v === value && i++));
			return i;
		}

		var count = getOccurence(myArray, 'Yes');
		console.log(count);

		//build logic table
		if (count <= 1) {
			var score = 0.0
			return score;
		}
		else if (count == 2) {
			var score = 0.5
			return score;
		}
		else if (count == 3) {
			var score = 1.0
			return score;
		}

	}

	console.log("Calc Protein Intake: " + calcProteinIntake())

	total = parseFloat(extractNo(req.body.liveInd))
		+ parseFloat(extractNo(req.body.drugs))
		+ parseFloat(extractNo(req.body.ulcers))
		+ parseFloat(extractNo(req.body.fullmeals))
		+ parseFloat(extractNo(req.body.vegetal))
		+ parseFloat(extractNo(req.body.fluids))
		+ parseFloat(extractNo(req.body.feeding))
		+ parseFloat(extractNo(req.body.nutrition))
		+ parseFloat(extractNo(req.body.healthStat))
		+ parseFloat(extractNo(req.body.mac))
		+ parseFloat(extractNo(req.body.cc))
		+ parseFloat(calcProteinIntake());

	liveInd = removeNumber.removeNumberFunction(req.body.liveInd);
	drugs = removeNumber.removeNumberFunction(req.body.drugs);
	ulcers = removeNumber.removeNumberFunction(req.body.ulcers);
	fullmeals = removeNumber.removeNumberFunction(req.body.fullmeals);
	vegetal = removeNumber.removeNumberFunction(req.body.vegetal);
	fluids = removeNumber.removeNumberFunction(req.body.fluids);
	feeding = removeNumber.removeNumberFunction(req.body.feeding);
	nutrition = removeNumber.removeNumberFunction(req.body.nutrition);
	healthStat = removeNumber.removeNumberFunction(req.body.healthStat);
	mac = removeNumber.removeNumberFunction(req.body.mac);
	cc = removeNumber.removeNumberFunction(req.body.cc);
	dairy = req.body.dairy;
	eggs = req.body.eggs;
	meats = req.body.meats;

	console.log("Total: " + total);

	new MasterMNA({
		patientID: req.params.recordID,
		mnaID: mnaID,
		date: req.body.dateMNA2,
		time: req.body.timeMNA2,
		datetime: datetime,
		liveInd: liveInd,
		drugs: drugs,
		ulcers: ulcers,
		fullmeals: fullmeals,
		dairy: req.body.dairy,
		eggs: req.body.eggs,
		meats: req.body,meats,
		vegetal: vegetal,
		fluids: fluids,
		feeding: feeding,
		nutrition: nutrition,
		healthStat: healthStat,
		mac: mac,
		cc: cc,
		assessmentScore: total,

		liveIndfull: req.body.liveInd,
		drugsfull: req.body.drugs,
		ulcersfull: req.body.ulcers,
		fullmealsfull: req.body.fullmeals,
		vegetalfull: req.body.vegetal,
		fluidsfull: req.body.fluids,
		feedingfull: req.body.feeding,
		nutritionfull: req.body.nutrition,
		healthStatfull: req.body.healthStat,
		macfull: req.body.mac,
		ccfull: req.body.cc,
		totalScore: total

	}).save();

	res.redirect('/student/mna/' +req.params.recordID);
});

router.put('/edit-mna/:recordID/:mnaID', ensureAuthenticated, (req, res) => {
	datetime = moment(req.body.dateMna, 'DD/MM/YYYY').format('MM/DD/YYYY') + " ";

	total = parseInt(req.body.foodIntake.slice(-1)) 
		+ parseInt(req.body.weightLoss.slice(-1)) 
		+ parseInt(req.body.mobility.slice(-1))
		+ parseInt(req.body.psych.slice(-1)) 
		+ parseInt(req.body.neuroPsych.slice(-1)) 
		+ parseInt(req.body.BMI.slice(-1));

	foodIntake = removeNumber.removeNumberFunction(req.body.foodIntake);
	weightLoss = removeNumber.removeNumberFunction(req.body.weightLoss);
	mobility = removeNumber.removeNumberFunction(req.body.mobility);
	psych = removeNumber.removeNumberFunction(req.body.psych);
	neuroPsych = removeNumber.removeNumberFunction(req.body.neuroPsych);

	MasterMNA.findOne({ mnaID: req.params.mnaID }).then(editMNA => {
		editMNA.foodIntake = foodIntake,
		editMNA.weightLoss = weightLoss,
		editMNA.mobility = mobility,
		editMNA.psych = psych,
		editMNA.neuroPsych = neuroPsych,
		editMNA.BMI = req.body.BMI,
		editMNA.screenScore = total,

		editMNA.foodIntakefull = req.body.foodIntake,
		editMNA.weightLossfull = req.body.weightLoss,
		editMNA.mobilityfull = req.body.mobility,
		editMNA.psychfull = req.body.psych,
		editMNA.neuroPsychfull = req.body.neuroPsych,
		editMNA.totalScore = total + editMNA.assessmentScore;

		editMNA.save();
	});
	res.redirect('/student/mna/' + req.params.recordID);
});

router.put('/edit-mna2/:recordID/:mnaID', ensureAuthenticated, (req, res) => {
	datetime = moment(req.body.dateMna, 'DD/MM/YYYY').format('MM/DD/YYYY') + " ";

	function extractNo(str) {
        var matches = str.match(/\d+\.?\d*/);

        if (matches) {
            return matches[0]
        }
	}
	
	function calcProteinIntake() {
		var dairy = req.body.dairy;
		var eggs = req.body.eggs;
		var meats = req.body.meats;

		let myArray = [dairy, eggs, meats];

		//checks for no of occurence in array 
		function getOccurence(array, value) {
			var i = 0;
			array.forEach((v) => (v === value && i++));
			return i;
		}

		var count = getOccurence(myArray, 'Yes');
		console.log(count);

		//build logic table
		if (count <= 1) {
			var score = 0.0
			return score;
		}
		else if (count == 2) {
			var score = 0.5
			return score;
		}
		else if (count == 3) {
			var score = 1.0
			return score;
		}

	}

	console.log("Calc Protein Intake: " + calcProteinIntake())

	total = parseFloat(extractNo(req.body.liveInd))
		+ parseFloat(extractNo(req.body.drugs))
		+ parseFloat(extractNo(req.body.ulcers))
		+ parseFloat(extractNo(req.body.fullmeals))
		+ parseFloat(extractNo(req.body.vegetal))
		+ parseFloat(extractNo(req.body.fluids))
		+ parseFloat(extractNo(req.body.feeding))
		+ parseFloat(extractNo(req.body.nutrition))
		+ parseFloat(extractNo(req.body.healthStat))
		+ parseFloat(extractNo(req.body.mac))
		+ parseFloat(extractNo(req.body.cc))
		+ parseFloat(calcProteinIntake());

	liveInd = removeNumber.removeNumberFunction(req.body.liveInd);
	drugs = removeNumber.removeNumberFunction(req.body.drugs);
	ulcers = removeNumber.removeNumberFunction(req.body.ulcers);
	fullmeals = removeNumber.removeNumberFunction(req.body.fullmeals);
	vegetal = removeNumber.removeNumberFunction(req.body.vegetal);
	fluids = removeNumber.removeNumberFunction(req.body.fluids);
	feeding = removeNumber.removeNumberFunction(req.body.feeding);
	nutrition = removeNumber.removeNumberFunction(req.body.nutrition);
	healthStat = removeNumber.removeNumberFunction(req.body.healthStat);
	mac = removeNumber.removeNumberFunction(req.body.mac);
	cc = removeNumber.removeNumberFunction(req.body.cc);
	dairy = req.body.dairy;
	eggs = req.body.eggs;
	meats = req.body.meats;

	MasterMNA.findOne({ mnaID: req.params.mnaID }).then(editMNA2 => {
		editMNA2.liveInd = liveInd,
		editMNA2.drugs = drugs,
		editMNA2.ulcers = ulcers,
		editMNA2.fullmeals = fullmeals,
		editMNA2.vegetal = vegetal,
		editMNA2.fluids = fluids,
		editMNA2.feeding = feeding,
		editMNA2.nutrition = nutrition,
		editMNA2.healthStat = healthStat,
		editMNA2.mac = mac,
		editMNA2.cc = cc,
		editMNA2.dairy = dairy,
		editMNA2.eggs = eggs,
		editMNA2.meats = meats,
		editMNA2.assessmentScore = total

		editMNA2.liveIndfull = req.body.liveInd,
		editMNA2.drugsfull = req.body.drugs,
		editMNA2.ulcersfull = req.body.ulcers,
		editMNA2.fullmealsfull = req.body.fullmeals,
		editMNA2.vegetalfull = req.body.vegetal,
		editMNA2.fluidsfull = req.body.fluids,
		editMNA2.feedingfull = req.body.feeding,
		editMNA2.nutritionfull = req.body.nutrition,
		editMNA2.healthStatfull = req.body.healthStat,
		editMNA2.macfull = req.body.mac,
		editMNA2.ccfull = req.body.cc,
		editMNA2.totalScore = total + editMNA2.screenScore;

		editMNA2.save();
	});
	res.redirect('/student/mna/' + req.params.recordID);
});

//ivfluid
router.post('/add-fluid/:recordID', ensureAuthenticated, (req, res) => {
	fluidID = (new standardID('AAA0000')).generate();
	datetime = moment(req.body.dateFluid, 'DD/MM/YYYY').format('MM/DD/YYYY') + " " + req.body.timeFluid;

	new MasterFluidRegime({
		patientID: req.params.recordID,
		fluidID: fluidID,
		date: moment(req.body.dateFluid, 'DD/MM/YYYY').format('YYYY-MM-DD'),
		time: req.body.timeFluid,
		datetime: datetime,
		typeofFluid: req.body.typeofFluid,
		ordersFluid: req.body.ordersFluid,
		masterpatientID: req.session.patient.patientID,
		by: req.user.firstName,

	}).save();

	res.redirect('/student/ivfluid/' + req.params.recordID);
})

router.get('/ivfluid/:recordID', ensureAuthenticated, (req, res) => {

	MasterFluidRegime.find({ patientID: req.session.patient.patientID })
	.sort({'datetime': 1}).then(newFluid => {
		MasterScheduleFluid.find({ masterpatientID: req.session.patient.patientID, patientID: req.params.recordID })
		.sort({'date': -1, 'time': 1}).then(newOtherScheduleFluid => {

			var length = 0;
			length = length * 2;
			schedsample = [];
			schedsampleDate = [];

			let schedFlow = Object.assign([], newOtherScheduleFluid);
			schedCount = -1;
			schednoRecord = 'No existing record';

			var finalDate = [];

			newOtherScheduleFluid.forEach(sched => {
				if (!(schedsample.includes(sched.datetime))) {
					schedsample.push(sched.datetime);
					schedsampleDate.push(sched.date);
				}

				if (!(schedsample.includes(sched.datetime))) {
					schedsample.push(sched.datetime);
					schedsampleDate.push(sched.date);
				}	
			});

			schedsample.sort();
			schedsampleDate.sort();
			
			for (i = 0; i < finalDate.length; i++) {
				
				//Counter for empty data
				//.length here refers to last index of the array
				if (schedCount !== (finalDate.length - 1)) {
					//console.log("Schedule count: " + schedCount);
					//console.log("Schedule Length: " + (finalDate));
					schedCount++;
				}
				if(schedFlow != '') 
				{
					if (schedsample[i] < schedFlow[schedCount].datetime) {
						
						schedFlow.splice(schedCount, 0, {datetime: ''});

					} else if (schedsample[i] > schedFlow[schedCount].datetime) {
						schedFlow.splice(schedCount + 1, 0, {datetime: ''});
					}
				} 
				else
				{
					schedFlow.push({datetime: '', scheduleFluid: schednoRecord});
				}
			};

			userType = req.user.userType == 'student';
			if (req.user.userType == 'staff')
			{
				userType = 'student';
			}
			res.render('charts/master/charts-fluid-regime', {
				recordID: req.params.recordID,
				newOtherScheduleFluid: hbsSecurity.hbsFixArr(newOtherScheduleFluid),
				userType: userType,
				currentUserType: req.user.userType,
				studentFirstName: req.session.firstNameAndEmail,
				newFluid: hbsSecurity.hbsFixArr(newFluid),
				schedRowspan: length,
				currentName: req.user.firstName,
				patient: req.session.patient,
				scheddateVal: schedsample,
				finalDate: finalDate.length -1,
				schedFlow: schedFlow,
				showMenu: true
			});
		});
	});
});

//Add Schedule
router.post('/add-schedule-fluid/:recordID', ensureAuthenticated, (req, res) => {
	scheduleID = (new standardID('AAA0000')).generate();
	datetime = moment(req.body.dateSchedule, 'DD/MM/YYYY').format('MM/DD/YYYY') + " " + req.body.timeSchedule;
	new MasterScheduleFluid({
		user: req.user.id,
		by: req.user.firstName,
		patientID: req.params.recordID,
		date: moment(req.body.dateSchedule, 'DD/MM/YYYY').format('YYYY-MM-DD'),
		time: req.body.timeSchedule,
		datetime: datetime,
		masterpatientID: req.session.patient.patientID,
		scheduleFluid: req.body.scheduleFluid,
		scheduleAmt: req.body.scheduleAmt,
		schedcomments: req.body.schedcomments,
		scheduleID: scheduleID
	}).save();
	res.redirect('/student/ivfluid/' + req.params.recordID);
});

router.get('/ScheduleFluid/:recordID/:scheduleID/:name', ensureAuthenticated, (req, res) => {
	userType = req.user.userType == 'student';

	if (req.user.userType == 'staff')
	{
		userType = 'student';

		PatientStudentModel.findOne({ recordID: req.params.recordID })
		.then(patientStudent => {

			MasterScheduleFluid.find({ masterpatientID: req.session.patient.patientID, user: patientStudent.user })
			.sort({'date': -1, 'time': 1}).then(newOtherScheduleFluid => {

				MasterScheduleFluid.findOne({ scheduleID: req.params.scheduleID })
				.then(editSchedule => {

					editSchedule.date = moment(editSchedule.date, 'YYYY-MM-DD').format('DD/MM/YYYY');

					var name = req.params.name;
					res.render('charts/master/charts-fluid-regime', {
						editSchedule: hbsSecurity.hbsFix(editSchedule),
						patient: req.session.patient,
						userType: userType,
						recordID: req.params.recordID,
						newOtherScheduleFluid: hbsSecurity.hbsFixArr(newOtherScheduleFluid),
						currentName: req.user.firstName,
						currentUserType: req.user.userType,
						by: name,
						checkifEmpty: false,
						currentUserType: req.user.userType,
						showMenu: true
					})
				});
			});
		});
	}
	else
	{
		PatientStudentModel.findOne({ recordID: req.params.recordID })
		.then(patientStudent => {
			MasterScheduleFluid.find({ masterpatientID: req.session.patient.patientID })
			.sort({'date': -1, 'time': 1}).then(newOtherScheduleFluid => {
				MasterScheduleFluid.findOne({ scheduleID: req.params.scheduleID, patientID: req.params.recordID })
				.then(editSchedule => {

					editSchedule.date = moment(editSchedule.date, 'YYYY-MM-DD').format('DD/MM/YYYY');
					var name = req.params.name;
					res.render('charts/master/charts-fluid-regime', {
						editSchedule: hbsSecurity.hbsFix(editSchedule),
						patient: req.session.patient,
						userType: userType,
						currentName: req.user.firstName,
						newOtherScheduleFluid: hbsSecurity.hbsFixArr(newOtherScheduleFluid),
						recordID: req.params.recordID,
						currentUserType: req.user.userType,
						by: name,
						checkifEmpty: false,
						currentUserType: req.user.userType,
						showMenu: true
					})
				})
			})
		});
	}
})

//Edit the Schedule
router.put('/edit-schedule-fluid/:recordID/:scheduleID/:name', ensureAuthenticated, (req,res) => {
	datetime = moment(req.body.dateSchedule, 'DD/MM/YYYY').format('MM/DD/YYYY') + " " + req.body.timeSchedule;

	MasterScheduleFluid.findOne({scheduleID: req.params.scheduleID})
	.then(editSchedule => {
		editSchedule.date = moment(req.body.dateSchedule, 'DD/MM/YYYY').format('YYYY-MM-DD'),
		editSchedule.time = req.body.timeSchedule,
		editSchedule.datetime = datetime,
		editSchedule.scheduleFluid = req.body.scheduleFluid,
		editSchedule.scheduleAmt = req.body.scheduleAmt,
		editSchedule.scheduleFlush = req.body.scheduleFlush,
		editSchedule.schedcomments = req.body.schedcomments,

		editSchedule.save();
	});
	res.redirect("/student/ivfluid/" + req.params.recordID);
})

//open route to wound page
router.get('/wound/:recordID', ensureAuthenticated, (req, res) => {
	userType = req.user.userType == 'student';
		PatientStudentModel.find({ recordID: req.params.recordID}).then(newG =>{
			console.log(newG);
			MasterWound.find({ patientID: req.params.recordID}).sort({'date':-1}).then(Gwound => {
			
				console.log(req.params.recordID.slice(0, 7));
			//console.log(newWound);
			userType = req.user.userType == 'student';
			if (req.user.userType == 'staff')
			{
				userType = 'student';
			}
			console.log(userType);

			sample = [];
			sampleDate = [];
			let newWound = Object.assign([], Gwound);
			woundCount = -1;
			noRecord = 'No existing record';

			Gwound.forEach(wou => {
				if (!(sample.includes(wou.datetime))) {
					sample.push(wou.datetime);
					sampleDate.push(wou.date);
				}
			});
			sample.sort();
			sampleDate.sort();
			console.log(sample);

			for (i = 0; i < sample.length; i++) {
				//Counter for empty data
				//.length here refers to last index of the array
				if (woundCount !== (newWound.length - 1)) {
					woundCount++;
				}

				//Insert empty data when value doesnt match
				//Count here does the index count of flow array
				if (newWound != '') {
					if (sample[i] < newWound[woundCount].datetime) {
						newWound.splice(woundCount, 0, {datetime: ''});
					} else if (sample[i] > newWound[woundCount].datetime) {
						newWound.splice(woundCount + 1, 0, {datetime: ''});
					}
				} else {
					newWound.push({datetime: ''});
				}
			};

			res.render('charts/master/charts-wound', {
				// azureId: req.user.azure_oid,
				recordID: req.params.recordID,
				userType: userType,
				newG: hbsSecurity.hbsFixArr(newG),
				newWound: hbsSecurity.hbsFixArr(newWound),
				patient: req.session.patient,
				currentUserType: req.user.userType,
				studentFirstName: req.session.firstNameAndEmail,
				showMenu: true
			})
		})
	})	
})


//get single wound info
router.get('/wound/:recordID/:woundID', ensureAuthenticated, (req, res) => {
	userType = req.user.userType == 'student';
	PatientStudentModel.find({ recordID: req.params.recordID}).then(newG =>{
		MasterWound.find({ patientID: req.params.recordID }).sort({'date':-1}).then(newWound => {
			MasterWound.findOne({ woundID: req.params.woundID }).sort({'date':-1}).then(editWound => {
				res.render('charts/master/charts-wound', {
					// azureId: req.user.azure_oid,
					newG: hbsSecurity.hbsFixArr(newG),
					recordID: req.params.recordID,
					userType: userType,
					newWound: hbsSecurity.hbsFixArr(newWound),
					editWound: hbsSecurity.hbsFix(editWound),
					patient: req.session.patient,
					showMenu: true			
				})
			})
		})	
	})
})

//add wound info
router.post('/add-wound/:recordID', ensureAuthenticated, (req, res) => {
	woundID = (new standardID('AAA0000')).generate();
	today = new Date();
	//date = moment(today, 'DD/MM/YYYY').format('MM/DD/YYYY') + " ";
	datetime = moment(today, 'DD/MM/YYYY').format('MM/DD/YYYY') + " " + moment(today, 'HH:mm:ss').format('HH:mm:ss');
	time = moment(today, 'HH:mm:ss').format('HH:mm:ss') + " ";
	
	if (req.body.woundLabel === "" || /^\s*$/.test(req.body.woundLabel) || req.body.woundLabel.length === 0) {
		req.flash('error_msg', 'Please Key In the Wound label');
	}
	else if(req.body.woundLat === "" && req.body.woundLng === "")
	{
		req.flash('error_msg', 'Please Add a marker before saving the wound');
	}
	else if(req.body.statuswound === undefined){
		req.flash('error_msg', 'Please select the wound status before saving');
	}
	else{
		new MasterWound({
				// patientID: req.session.patient.patientID,
				patientID: req.params.recordID,
				woundID: woundID,
				// by: req.user.azure_oid,
				date: datetime,
				time: time,
				gender: PatientMasterModel.gender,
				woundLabel: req.body.woundLabel,
				markerID: req.body.markerId,
				woundP1: req.body.woundLat,
				woundP2: req.body.woundLng,
				woundCat: req.body.woundCat,
				woundtype: req.body.woundtype,
				woundLocation: req.body.woundLocation,
				woundL: req.body.woundL,
				woundW: req.body.woundW,
				woundD: req.body.woundD,
				wounddrain: req.body.wounddrain,
				woundodor: req.body.woundodor,
				woundedges: req.body.woundedges,
				periwound: req.body.periwound,
				dresswound: req.body.dresswound,
				solutionsU: req.body.solutionsU,
				interventions: req.body.interventions,
				patientresponse: req.body.patientresponse,
				woundremarks: req.body.woundremarks,
				woundstatus: req.body.statuswound


		}).save();
}
	res.redirect('/student/wound/'+req.params.recordID);
})

//Edit wound information
router.put('/edit-wound/:recordID/:woundID', ensureAuthenticated, (req,res) => {
	today = new Date();
	//date = moment(today, 'DD/MM/YYYY').format('MM/DD/YYYY') + " ";
	datetime = moment(today, 'DD/MM/YYYY').format('MM/DD/YYYY') + " " + moment(today, 'HH:mm:ss').format('HH:mm:ss');
	time = moment(today, 'HH:mm:ss').format('HH:mm:ss') + " ";

	/*new MasterWound({
		// patientID: req.session.patient.patientID,
		patientID: req.params.recordID,
		woundID: req.params.woundID,
		date: datetime,
		time: time,
		gender: PatientMasterModel.gender,
		woundLabel: req.body.woundLabel,
		markerID: req.body.markerId,
		woundCat: req.body.woundCat,
		woundtype: req.body.woundtype,
		woundLocation: req.body.woundLocation,
		woundL: req.body.woundL,
		woundW: req.body.woundW,
		woundD: req.body.woundD,
		wounddrain: req.body.wounddrain,
		woundodor: req.body.woundodor,
		woundedges: req.body.woundedges,
		periwound: req.body.periwound,
		dresswound: req.body.dresswound,
		solutionsU: req.body.solutionsU,
		interventions: req.body.interventions,
		patientresponse: req.body.patientresponse,
		woundremarks: req.body.woundremarks,
		woundstatus: req.body.statuswound


}).save();*/

	MasterWound.findOne({ woundID: req.params.woundID }).then(editWound => {

		editWound.date = datetime,
		editWound.time = time,
		editWound.gender = PatientMasterModel.gender,
		editWound.woundLabel = req.body.woundLabel,
		editWound.markerID = req.body.markerId,
		editWound.woundP1 = req.body.woundLat,
		editWound.woundP2 = req.body.woundLng,
		editWound.woundCat = req.body.woundCat,
		editWound.woundtype = req.body.woundtype,
		editWound.woundLocation = req.body.woundLocation,
		editWound.woundL = req.body.woundL,
		editWound.woundW = req.body.woundW,
		editWound.woundD = req.body.woundD,
		editWound.wounddrain = req.body.wounddrain,
		editWound.woundodor = req.body.woundodor,
		editWound.woundedges = req.body.woundedges,
		editWound.periwound = req.body.periwound,
		editWound.dresswound = req.body.dresswound,
		editWound.solutionsU = req.body.solutionsU,
		editWound.interventions = req.body.interventions,
		editWound.patientresponse = req.body.patientresponse,
		editWound.woundremarks =  req.body.woundremarks,
		editWound.woundstatus =  req.body.statuswound

			editWound.save();
	});

	res.redirect('/student/wound/' + req.params.recordID);
})

module.exports = router;