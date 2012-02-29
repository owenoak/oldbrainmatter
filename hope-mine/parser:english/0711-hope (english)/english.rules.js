

english.rules = {
	"file"			: new Sequence(
								new RepeatingExpression("handler"),
								new Literal("EOF")
							),

	"handlerList" 	: //new Expression("handler"),
					  new Sequence(
								new Expression("handler"),
								new OptionalExpression("handlerList")
							),

	"handler"	  	: new Sequence(
								new Choice(
										new Literal("on"),
										new Literal("to"),
										new Literal("method"),
										new Literal("when")
									),

								new Identifier("methodName"),
								new Literal("EOL"),
								new Expression("statementList"),
								new Literal("end"),
								// optional identifier from above here!
								new Literal("EOL")
							),

	"statementList" : new Sequence(
								new Literal("STATEMENT"),
								new Literal("EOL")//,
//									new OptionalExpression("statementList")
							)

};