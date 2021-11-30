var cc = DataStudioApp.createCommunityConnector();

function getAuthType() {
	return {
		type: 'NONE',
	};
}

function getConfig(request) {
	var config = cc.getConfig();

	config.newInfo().setId('instructions').setText('Enter the bearer token.');

	config
		.newTextInput()
		.setId('bearer_token')
		.setName('Bearer token')
		.setHelpText(
			'You will need an approved Twitter developer account and must have created a Twitter developer App.'
		)
		.setPlaceholder('');

	config.setDateRangeRequired(true);

	return config.build();
}

function getSchema(request) {
	return {
		schema: [
			{
				name: 'account_name',
				label: 'Account Name',
				dataType: 'STRING',
				semantics: {
					conceptType: 'DIMENSION',
				},
			},
			{
				name: 'account_username',
				label: 'Account Username',
				dataType: 'STRING',
				semantics: {
					conceptType: 'DIMENSION',
				},
			},
			{
				name: 'division',
				label: 'Division',
				dataType: 'STRING',
				semantics: {
					conceptType: 'DIMENSION',
				},
			},
			{
				name: 'number_of_tweets',
				label: 'Number of Tweets',
				dataType: 'NUMBER',
				semantics: {
					conceptType: 'METRIC',
				},
			},
			{
				name: 'number_of_retweets',
				label: 'Number of Retweets',
				dataType: 'NUMBER',
				semantics: {
					conceptType: 'METRIC',
				},
			},
			{
				name: 'combined_tweets',
				label: 'Combined Tweets',
				dataType: 'NUMBER',
				semantics: {
					conceptType: 'METRIC',
				},
			},
		],
	};
}

function fetchDataFromAPI(BearerToken) {
	var headers = {
		Authorization: 'Bearer ' + BearerToken,
	};
	var data = [];

	var Divisions = {
		COAS: ['ESUArtDesign','ESU_CMST','ESU_G3D_Lab','ESUGallery','ESUModLang', 'ESU_Sciences'],
		COBM: ['ESU_COBM', 'ESUHRTM', 'ESUDMT', 'ESUSMGT', 'ESU_CMF'],
		CLIE: ['ESUCampusLife', 'ESUWellness', 'esu_saa'],
		SAA: ['ESURec'],
		COED: ['ESUCollegeofEd'],
		COHS: ['ESU_EXSC'],
		AA: ['esuLibrary'],
		OP: ['ESUWarriors'],
	};

	var today = new Date();

	var endDate = new Date(
		today.getFullYear(),
		today.getMonth(),
		today.getDate()
	).toISOString();

	var startDate = new Date(
		today.getFullYear() - 1,
		today.getMonth(),
		today.getDate() - 1
    ).toISOString();
    
    var accountIndex = 0;
    
	for (var k in Divisions) {
		Divisions[k].forEach(function (twitterAccount) {
			try {
				//API Call 1
				var url =
					'https://api.twitter.com/2/users/by/username/' + twitterAccount;
				var result = UrlFetchApp.fetch(url, { headers: headers });
				parsedResult = JSON.parse(result.getContentText());

				//Do Stuff with API Call 1
				var accountName = parsedResult['data'].name;
				var accountUsername = parsedResult['data'].username;
				var accountID = parsedResult.data.id;

				//API Call 2
				url =
					'https://api.twitter.com/2/users/' +
					accountID +
					'/tweets?max_results=100&start_time=' +
					startDate +
					'&end_time=' +
					endDate;
				result = UrlFetchApp.fetch(url, { headers: headers });
				parsedResult = JSON.parse(result.getContentText());

				//doStuff with API Call 2
				var totaltweetsCt = parsedResult['meta'].result_count;
				var retweetsCt = parsedResult['data'].filter((tweet) =>
					tweet.text.startsWith('RT')
				).length;

				while ('next_token' in parsedResult.meta) {
					var nextToken = parsedResult['meta'].next_token;
					//API Call 3
					url =
						'https://api.twitter.com/2/users/' + accountID +
                        '/tweets?max_results=100&start_time=' + startDate +
                        '&end_time=' + endDate +
                        '&pagination_token=' + nextToken;
					result = UrlFetchApp.fetch(url, { headers: headers });
					parsedResult = JSON.parse(result.getContentText());

					//doStuff with API Call 3
					if (parsedResult['meta'].result_count != 0) {
						totaltweetsCt += parsedResult['meta'].result_count;
						retweetsCt += parsedResult['data'].filter((tweet) =>
							tweet.text.startsWith('RT')
						).length;
					}
				}

				var accountData = {
					name:
						accountName +' (' +Object.getOwnPropertyNames(Divisions)[accountIndex] +')',
					username: accountUsername,
					division: Object.getOwnPropertyNames(Divisions)[accountIndex],
					total_retweets: retweetsCt,
					total_tweets: totaltweetsCt - retweetsCt,
					combined_tweets: totaltweetsCt,
				};
                data.push(accountData);
			} catch (e) {
				DataStudioApp.createCommunityConnector()
					.newUserError()
					.setDebugText('Exception details: ' + e)
					.setText('One or more twitter accounts do not exist.')
					.throwException();

				console.log('ERROR: ' + e);
			}
		});
		i++;
	}
	return data;
}

function buildTabularData(plays, dataSchema) {
	var data = [];

	plays.forEach(function (info) {
		var values = [];
		dataSchema.forEach(function (field) {
			switch (field.name) {
				case 'account_name':
					values.push(info.name);
					break;
				case 'account_username':
					values.push(info.username);
					break;
				case 'number_of_retweets':
					values.push(info.total_retweets);
					break;
				case 'number_of_tweets':
					values.push(info.total_tweets);
					break;
				case 'combined_tweets':
					values.push(info.combined_tweets);
					break;
				case 'division':
					values.push(info.division);
					break;
				default:
					values.push('');
			}
		});
		data.push({
			values: values,
		});
	});

	return {
		schema: dataSchema,
		rows: data,
	};
}

function getData(request) {
	var dataSchema = prepareSchema(request);

	BearerToken = request.configParams.bearer_token;
	var startDate = request.dateRange.startDate;
	var endDate = request.dateRange.endDate;

	var cache = new DataCache(CacheService.getScriptCache(), startDate, endDate);
	var data = null;
	data = fetchFromCache(cache);
    if (!data) {
        try {
            data = fetchDataFromAPI(BearerToken);
        }
        catch (e) {
            DataStudioApp.createCommunityConnector()
                .newUserError()
                .setDebugText('Error fetching data from API. Exception details: ' + e)
                .setText('There was an error communicating with the service. Try again later, or file an issue if this error persists.')
                .throwException();
        }
        setInCache(data, cache);
    }
	return buildTabularData(data, dataSchema);
}

function prepareSchema(request) {
	// Prepare the schema for the fields requested.
	var dataSchema = [];
	var fixedSchema = getSchema().schema;
	request.fields.forEach(function (field) {
		for (var i = 0; i < fixedSchema.length; i++) {
			if (fixedSchema[i].name == field.name) {
				dataSchema.push(fixedSchema[i]);
				break;
			}
		}
	});

	return dataSchema;
}

function fetchFromCache(cache) {
	var plays = null;
	console.log('Trying to fetch from cache...');
	try {
		var playsString = cache.get();
		plays = JSON.parse(playsString);
		console.log('Fetched succesfully from cache', plays.length);
	} catch (e) {
		console.log('Error when fetching from cache:', e);
	}

	return plays;
}

function setInCache(plays, cache) {
	console.log('Setting data to cache...');
	try {
		cache.set(JSON.stringify(plays));
	} catch (e) {
		console.log('Error when storing in cache', e);
	}
}

function isAdminUser() {
	return true;
}
