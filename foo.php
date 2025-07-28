<?php
echo 'PHP ',$_SERVER['REQUEST_METHOD'],' ';
if (in_array($_SERVER['REQUEST_METHOD'],['PATCH','PUT','DELETE'])) :
	$raw_data = file_get_contents("php://input");
	$pattern = '/Content-Disposition: form-data; name="([^"]+)"\s*([^\-][^\n]*)/';
	preg_match_all($pattern, $raw_data, $matches, PREG_SET_ORDER);
	foreach ($matches as $match) $_REQUEST[$match[1]] = trim($match[2]);
endif;
print_r($_REQUEST);
echo ' rand',rand(0,100);