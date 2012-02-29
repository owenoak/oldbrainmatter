<xsl:stylesheet xmlns:xsl='http://www.w3.org/1999/XSL/Transform' version='1.0'>

	<xsl:template match='/'>
		<html>
			<head>
				<title>Grammar</title>
				<style>
					TABLE { margin-left: 1em; }
				</style>
			</head>
			<body>
				<xsl:apply-templates />
			</body>
		</html>
	</xsl:template>

	<xsl:template match='grammar'>
		<h1>Grammar</h1>
		<xsl:apply-templates select='patternset' />
		<xsl:if test='pattern'>
			<h3>Other</h3>
			<table border='0' cellpadding='3'>
				<xsl:apply-templates select='pattern' />
			</table>
		</xsl:if>
	</xsl:template>
	
	<xsl:template match='patternset'>
		<h3><xsl:value-of select='title' /></h3>
		<table border='0' cellpadding='3'>
			<xsl:apply-templates select='pattern' />
		</table>
	</xsl:template>
	
	<xsl:template match='pattern[not(preceding-sibling::pattern[@name=current()/@name])]'>
		<tr>
			<th align='left'><xsl:value-of select='@name' /></th>
			<th>=</th>
			<xsl:apply-templates select='*' />
		</tr>
	</xsl:template>

	<xsl:template match='pattern[preceding-sibling::pattern[@name=current()/@name]]'>
		<tr>
			<th></th>
			<th>|</th>
			<xsl:apply-templates select='*' />
		</tr>
	</xsl:template>

	<xsl:template match='token'>
		"<xsl:value-of select='@s' />"
		<xsl:text> </xsl:text>
	</xsl:template>

	<!--
	<xsl:template match='*[not(/grammar/pattern[@name=current()/@name])]'>
		<b style='color:red'><xsl:value-of select='name()' /></b>
		<xsl:text> </xsl:text>
	</xsl:template>
	-->

	<xsl:template match='*[@native]'>
		<tr>
			<th align='left'><xsl:value-of select='@name' /></th>
			<th>=</th>
			<td>
				<i><xsl:value-of select='@native' /></i>
				<xsl:text> </xsl:text>
			</td>
		</tr>
	</xsl:template>
	
	<xsl:template match='javascript' />

	<xsl:template match='*'>
		<xsl:value-of select='name()' />
		<xsl:text> </xsl:text>
	</xsl:template>

</xsl:stylesheet>