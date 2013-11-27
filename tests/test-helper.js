function getTestRunner(Y) {

	Y.substitute = function(s, o) {
		return s.replace(/{(\w+)}/g, function(m0, m1) { return o[m1]; });
	};

	if(Y.Console) {
	//create the console
		new Y.Console({
			newestOnTop : false,
			height: "720px",
			width: "800px",
			style: 'block' // to anchor in the example content
		}).render('#testLogger');
	}
	
	var TestRunner = YUITest.TestRunner;
	var label = "TestRunner";
	
	//function to handle events generated by the testrunner
	function logEvent(event) {
		
		//data variables
		var message = "",
		    messageType = "";
		
		switch(event.type){
			case TestRunner.BEGIN_EVENT:
				message = "Testing began at " + (new Date()).toString() + ".";
				messageType = "info";
				label = "TestRunner";
				break;
				
			case TestRunner.COMPLETE_EVENT:
				message = Y.substitute("Testing completed at " +
					(new Date()).toString() + ".\n" +
					"Passed:{passed} Failed:{failed} " +
					"Total:{total} ({ignored} ignored)",
					event.results);
				messageType = "info";
				label = "TestRunner";
				break;
				
			case TestRunner.TEST_FAIL_EVENT:
				message = event.testName + ": failed.\n" + event.error.getMessage();
				messageType = "fail";
				break;
				
			case TestRunner.TEST_IGNORE_EVENT:
				message = event.testName + ": ignored.";
				messageType = "ignore";
				break;
				
			case TestRunner.TEST_PASS_EVENT:
				message = event.testName + ": passed.";
				messageType = "pass";
				break;
				
			case TestRunner.TEST_SUITE_BEGIN_EVENT:
				message = "Test suite \"" + event.testSuite.name + "\" started.";
				messageType = "info";
				label = event.testSuite.name;
				break;
				
			case TestRunner.TEST_SUITE_COMPLETE_EVENT:
				message = Y.substitute("Test suite \"" +
					event.testSuite.name + "\" completed" + ".\n" +
					"Passed:{passed} Failed:{failed} " +
					"Total:{total} ({ignored} ignored)",
					event.results);
				messageType = "info";
				label = event.testSuite.name;
				break;
				
			case TestRunner.TEST_CASE_BEGIN_EVENT:
				message = "Test case \"" + event.testCase.name + "\" started.";
				messageType = "info";
				label = event.testCase.name;
				break;
				
			case TestRunner.TEST_CASE_COMPLETE_EVENT:
				message = Y.substitute("Test case \"" +
					event.testCase.name + "\" completed.\n" +
					"Passed:{passed} Failed:{failed} " +
					"Total:{total} ({ignored} ignored)",
					event.results);
				messageType = "info";
				label = event.testCase.name;
				break;
			default:
				message = "Unexpected event " + event.type;
				message = "info";
		}
	
		//only log if required
		if(Y.Console) {
			Y.log(message, messageType, label);
		}
		else {
			console.log(message, messageType, label);
		}
	}
	
	//listen for events to publish to the logger
	TestRunner.attach(TestRunner.BEGIN_EVENT, logEvent);
	TestRunner.attach(TestRunner.COMPLETE_EVENT, logEvent);
	TestRunner.attach(TestRunner.TEST_CASE_BEGIN_EVENT, logEvent);
	TestRunner.attach(TestRunner.TEST_CASE_COMPLETE_EVENT, logEvent);
	TestRunner.attach(TestRunner.TEST_SUITE_BEGIN_EVENT, logEvent);
	TestRunner.attach(TestRunner.TEST_SUITE_COMPLETE_EVENT, logEvent);
	TestRunner.attach(TestRunner.TEST_PASS_EVENT, logEvent);
	TestRunner.attach(TestRunner.TEST_FAIL_EVENT, logEvent);
	TestRunner.attach(TestRunner.TEST_IGNORE_EVENT, logEvent);
	

	return TestRunner;
}

