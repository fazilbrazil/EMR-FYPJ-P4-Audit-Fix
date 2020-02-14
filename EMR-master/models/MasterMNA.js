const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const EMR_User = mongoose.model('emr-users');
//const NursingAssessmentModel = mongoose.model('assessmentModel'); // not working for embedding collection
const NursingAssessmentModel = require('./NursingAssessmentModel');


// Create Schema
const MasterMNASchema = new Schema({
    patientID: {type: String, require: true},
    nric:  {type: String, default: ''},
	familyName: {type: String, default: ''},
	givenName:  {type: String, default: ''},
	userID: {
		type: Schema.Types.ObjectId,
		ref: 'emr-users' 	// collection name in mongodb
	},
	nursingAssessmentID: {
		type: Schema.Types.ObjectId,
		ref: 'nursing-assessment'
	},
	datetime:	{type: String, default:''},
	date:	{type: String, default:''},
	time: 	{type: String, default:''},
	studentName: {type: String, default:''},
	
	//Part 1
    mnaID: {type: String, default: ''},
    foodIntake:	 {type: String, default: ''},
	weightLoss:	 {type: String, default: ''},
	mobility:		 {type: String, default: ''},
	psych:		 {type: String, default: ''},
	neuroPsych: 		 {type: String, default: ''},
	BMI:	 {type: String, default: ''},
	foodIntakefull:	{type: String, default: ''},
	weightLossfull:	{type: String, default: ''},
	mobilityfull:	{type: String, default: ''},
	psychfull:	{type: String, default: ''},
	neuroPsychfull:	{type: String, default: ''},
	screenScore: {type: Number, default: ''},

	//Part 2
	liveInd:	 {type: String, default: ''},
	drugs:	 {type: String, default: ''},
	ulcers:		 {type: String, default: ''},
	fullmeals:		 {type: String, default: ''},
	dairy: 		 {type: String, default: ''},
	eggs: 		 {type: String, default: ''},
	meats:		 {type: String, default: ''},
	vegetal: 		 {type: String, default: ''},
	fluids: 		 {type: String, default: ''},
	feeding: 		 {type: String, default: ''},
	nutrition: 		 {type: String, default: ''},
	healthStat: 		 {type: String, default: ''},
	mac: 		 {type: String, default: ''},
	cc: 		 {type: String, default: ''},
    assessmentScore: {type: Number, default: ''},
	
	liveIndfull: {type: String, default: ''},
	drugsfull: {type: String, default: ''},
	ulcersfull: {type: String, default: ''},
	fullmealsfull: {type: String, default: ''},
	vegetalfull: {type: String, default: ''},
	fluidsfull: {type: String, default: ''},
	feedingfull: {type: String, default: ''},
	nutritionfull: {type: String, default: ''},
	healthStatfull: {type: String, default: ''},
	macfull: {type: String, default: ''},
	ccfull: {type: String, default: ''},

	totalScore: {type: Number, default: ''},
})

mongoose.model('masterMNA', MasterMNASchema, 'master-MNA');