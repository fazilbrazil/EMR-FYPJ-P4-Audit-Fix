const hbsFixArr = (docArr) => {
	const tempArray = [];
	if (docArr.length !== 0){
		try {
			docArr.forEach(doc => tempArray.push(doc.toObject()));
		}
		catch(e) {
			console.error(e);
		}
	}
	return tempArray;
  };
  const hbsFix = (object) => { 
	  if (object == null)
	  { return null; } 
	  return object.toObject(); 
	};
module.exports = {hbsFix, hbsFixArr,};