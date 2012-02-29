About static test files

In order to develop the client and server portions of this application in parallel,
the Web UI has been configured to work properly with static test files in the 'api/test/' 
directory.   These files simulate the response that would be generated if the server was running.

Testing the Web UI without a functioning statsproxy server is quite easy:

	1)	Make sure you have mode_rewrite and .htaccess files working in your apache web server
	2)  Make a symbolic link to "api/htaccess" as:
			cd <root>/html/api/
			ln -s test/htaccess .htaccess
	3)	Add ".htaccess" to your <root>/.gitignore file so you don't accidentally change the htaccess file.


Note that to correctly map the URLs for data requests to the static test files, we take advantage
of the "mod_rewrite" module of apache web servers.  This correctly maps URLs such as:

	/api/MemcacheServer/latest/1.1.1.1/stats/basic

to the file
	/api/test/MemcacheServer/stats/basic.xml
	
To change the mod_rewrite rules, change the file "/api/htaccess".

