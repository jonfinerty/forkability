function getParameterByName(name) {
	name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
	var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
	var results = regex.exec(location.search);
	return results == null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

var myRef = new Firebase('https://blistering-inferno-9575.firebaseio.com');

var loadPage = function() {
	var currentUser;
	var repoOptions = {};
	var repos = [];

	repoOptions.username = getParameterByName('u');
	repoOptions.repository = getParameterByName('r');

	// var authClient = new FirebaseSimpleLogin(myRef, function(error, user) {
	// 	if (error) {
	// 		// an error occurred while attempting login
	// 		console.log(error);
	// 		$('.sign-out').hide();
	// 	} else if (user) {
	// 		$('.sign-out').show();
	// 		currentUser = user;
	// 		// user authenticated with Firebase
	// 		console.log('User ID: ' + user.uid + ', Provider: ' + user.provider);
	// 		if (repoOptions.username && repoOptions.repository) {
	// 			checkRepo(repoOptions.username, repoOptions.repository, currentUser.accessToken);
	// 		} else {
	// 			showRepoPicker({
	// 				defaultUsername: currentUser.username
	// 			}, repoOptions);
	// 		}
	// 	} else {
	// 		showSignIn();
	// 	}
	// });
	
	showSignIn();

	$('.sign-out').click(function () {
		// authClient.logout();
		$(this).hide();
	});

	function renderByID(id, o) {
		var source = $(id).html();
		var template = Handlebars.compile(source);
		return $('.main-body').html(template(o));
	}

	window.useGitHubCodes = function () {
		alert('Got it!');
		console.log(arguments);
	};

	function showSignIn() {
		var hero = renderByID('#sign-in-template');

		hero.find('.sign-in').click(function(e) {
			e.preventDefault();
			// authClient.login('github', {
			// 	rememberMe: true,
			// 	scope: 'user'
			// });
			var githubOAuthWindow = window.open(
				'https://github.com/login/oauth/authorize?client_id=ca8bf7cc025dd97fc008',
				'githubOAuthWindow',
				'location=0,status=0,dependent=true,menubar=false,toolbar=false,personalbar=false,directories=false,dialog=true,resizable=false,width=600,height=600');
			// 'outerWidth=600,width=500,innerWidth=400,resizable,scrollbars,status'
			// window.location.href = 'https://github.com/login/oauth/authorize?client_id=ca8bf7cc025dd97fc008';
		});
		$('.sign-out').hide();
	}

	function showRepoPicker(model, o) {
		var hero = renderByID('#choose-repo-template', model);
		getRepositories(repoOptions.username || currentUser.username);

		function getRepositories(username, cb) {
			var repositoryElement = hero.find('#repository');
			repositoryElement.attr('placeholder', 'Loading ' + username + '\'s repositories...');
			$.ajax(
				'https://api.github.com/users/' + username + '/repos',
				{
					dataType:'json',
					method:'GET',
					headers: {
						Authorization:'Token ' + currentUser.accessToken
					},
					success: function (data, textStatus, jqXHR) {
						hero.find('#repositories').html('');
						repositoryElement.attr('placeholder', 'Pick one of ' + username + '\'s repositories');
						$.each(data, function (i, repo) {
							hero.find('#repositories').append('<option value="' + repo.name + '">' + repo.name + '</option>');
						});
						console.log(data);
					}
				});
		}

		var submit = function(e) {
			e.preventDefault();
			var user = hero.find('#username').val() || currentUser.username;
			var repo = hero.find('#repository').val();
			if (!repo) {
				return alert('You really do need to enter a repository name');
			}
			checkRepo(user, repo, currentUser.accessToken);
		};

		hero.find('#username').change(function () {
			getRepositories(hero.find('#username').val() || currentUser.username);
		});

		if (o) {
			hero.find('#username').val(o.username);
			hero.find('#repository').val(o.repository);
		}

		hero.find('.repo-form').submit(submit);
		hero.find('#check-forkability').click(submit);
	}

	function checkRepo(user, repository, accessToken) {
		repoOptions = {};

		var forkabilityOpts = {
			user: user,
			repository: repository
		};

		if (accessToken) {
			forkabilityOpts.auth = {
				token: accessToken
			};
		} else {
			return showSignIn();
		}

		history.pushState({}, 'Forkability of ' + user + '/' + repository, '?u=' + user + '&r=' + repository);

		forkability(forkabilityOpts, function(err, report) {
			var reportElement = renderByID('#repo-info-template', { repoName : user + '/' + repository });
			if (!report.files.present.length) {
				$('<li class="message"><strong>Oops!</strong> You don\'t have any of the recommended features for your open source project!</li>').appendTo('.missing-files');
			}

			if (!report.files.missing.length) {
				$('<li class="message"><strong>Congrats!</strong> You have all the recommended features for your open source project!</li>').appendTo('.missing-files');
			}
			
			report.files.present.forEach(function(thing) {
				$('<li><i class="fa fa-check tick"></i> ' + thing + '</li>').appendTo(reportElement.find('.present-files'));
			});
			report.files.missing.forEach(function(thing) {
				$('<li><i class="fa fa-times cross"></i> ' + thing + '</li>').appendTo(reportElement.find('.missing-files'));
			});
			report.warnings.forEach(function(w, i) {
				var warningMessage = w.message;
				if (w.details && w.details.url && w.details.title) {
					warningMessage += '<br><i class="fa fa-long-arrow-right"></i><a href="' + w.details.url + '" target="_blank">' + w.details.title + '</a>';
				}
				var warning = $('<li class="warning"><i class="fa fa-exclamation exclaimation"></i> ' + warningMessage + '</li>').appendTo(reportElement.find('.warnings'));
			});

			// Now initialise all the pretty bootstrap stuff
			// $('.explanation-link').popover();
			// $('#warnings-modal').modal();
		});
	}
};

$(document).ready(loadPage);

window.onpopstate = function () {
	loadPage();
};