<?xml version="1.0" encoding="UTF-8"?>
<!-- Archivo de prueba del tema: XSLT. -->
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" indent="yes"/>
  <xsl:param name="minThreat" select="2"/>

  <xsl:template match="/registry">
    <ul class="registry">
      <xsl:for-each select="object[@threat &gt; $minThreat]">
        <xsl:sort select="@threat" data-type="number" order="descending"/>
        <li>
          <xsl:value-of select="concat(@code, ' — ', name)"/>
          <xsl:if test="@contained = 'false'">
            <strong> (brecha)</strong>
          </xsl:if>
        </li>
      </xsl:for-each>
    </ul>
  </xsl:template>
</xsl:stylesheet>
