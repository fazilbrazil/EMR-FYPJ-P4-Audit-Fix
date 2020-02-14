const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const EMR_User = mongoose.model('emr-users');
//const NursingAssessmentModel = mongoose.model('assessmentModel'); // not working for embedding collection
const NursingAssessmentModel = require('./NursingAssessmentModel');


// Create Schema
const MasterFluidRegimeSchema = new Schema({
	patientID:  {type: String, require: true},
	userID: {
		type: Schema.Types.ObjectId,
		ref: 'emr-users' 	// collection name in mongodb
	},
	fluidID:	 {type: String, default:''},
	userType:	 {type: String, default:''},
	datetime: 	{type: String, default:''},
	date:	{type: String, default:''},
	time:		 {type: String, default: ''},
	typeofFluid:		 {type: String, default: ''},
	ordersFluid:	 {type: String, default: ''},
	masterpatientID:{type: String, default:''},
	by: {type: String, default:''},
});

mongoose.model('masterFluidRegime', MasterFluidRegimeSchema, 'master-fluidRegime');