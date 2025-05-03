# PACU Flow Vision: Käyttöopas

## 1. Aloittaminen

PACU Flow Vision on simulaatiotyökalu, joka on suunniteltu mallintamaan ja optimoimaan heräämön (PACU) työnkulkua sairaalaympäristössä. Tämä opas auttaa sinua käyttämään sovellusta tehokkaasti.

### Sovelluksen yleiskatsaus

Sovellus koostuu useista pääosioista:
- **Simulaattori**: Ydinsimulaatioympäristö
- **Optimointi**: Työkalut leikkausaikataulujen optimointiin
- **Skenaariot**: Tallenna ja vertaile erilaisia simulaatioasetuksia
- **Raportit**: Luo ja vie simulaatiotuloksia
- **Ohjeet**: Apua ja tietoa sovelluksesta

## 2. Simulaatioparametrien asettaminen

Ennen simulaation ajamista sinun täytyy määrittää parametrit:

1. Siirry **Simulaattori**-välilehdelle
2. Valitse **Parametrit**-alavälilehti
3. Määritä seuraavat asetukset:

### Resurssiasetukset
- **Vuodepaikat**: Aseta heräämön vuoteiden määrä (4-20)
- **Hoitajat/vuoro**: Aseta hoitajien määrä (2-15)
- **Hoitaja:potilas-suhde**: Aseta suhde (1:1 - 1:4)
- **Simuloitavat päivät**: Aseta simuloitavien päivien määrä (7-90)

### Potilasjakauma
1. Siirry **Potilasjakauma**-välilehdelle
2. Säädä liukusäätimiä kullekin potilasluokalle asettaaksesi niiden prosenttiosuuden kokonaismäärästä
3. Varmista, että kokonaismäärä on 100% (sovellus varoittaa, jos näin ei ole)

### Laajennetut hoitaja-asetukset
1. Siirry **Hoitajat**-välilehdelle
2. Määritä hoitajien taidot:
   - Ota käyttöön / poista käytöstä laajennettu hoitajamalli
   - Lisää erilaisia taitotasoja
   - Määritä, mitä vaiheita kukin taitotaso voi käsitellä
   - Määritä tehokkuuskertoimet

3. Määritä hoitajien työvuorot:
   - Lisää erilaisia vuoroja aloitusaikoineen ja kestoineen
   - Aseta hoitajien määrä viikonpäivittäin
   - Määritä taitojakauma kunkin vuoron sisällä

## 3. Leikkaussaliblokkien luominen

Leikkaussaliblokit edustavat aikataulutettuja aikaikkunoita tietyille leikkaustyypeille tietyissä leikkaussaleissa:

1. Siirry **Salisuunnittelu**-välilehdelle
2. Napsauta **Lisää blokki** luodaksesi uuden blokin
3. Määritä kullekin blokille:
   - Valitse leikkaussali
   - Valitse viikonpäivä
   - Aseta aloitus- ja lopetusajat
   - Valitse sallitut potilasluokat/toimenpiteet
   - Anna blokille kuvaava nimi

4. Luo useita blokkeja edustamaan sairaalasi tyypillistä leikkaussaliaikataulua
5. Käytä **Käytössä**-kytkintä ottaaksesi blokkiaikataulutuksen käyttöön tai poistaaksesi sen käytöstä

## 4. Leikkauslistojen luominen

Leikkaussaliblokkien luomisen jälkeen voit luoda leikkauslistan:

1. Napsauta leikkaussaliblokkien näkymästä **Generoi leikkauslista**
2. Vaihtoehtoisesti siirry **Leikkauslista**-välilehdelle
3. Valitse joko:
   - **Pohja**: Luo automaattisesti leikkauksia parametrien perusteella
   - **Mukautettu**: Luo tai muokkaa leikkauslistaa manuaalisesti

4. Mukautetuille listoille voit:
   - Lisätä yksittäisiä leikkauksia
   - Tuoda leikkauksia datasta
   - Muokata olemassa olevia leikkauksia
   - Poistaa leikkauksia

5. Varmista, että leikkaukset ovat linjassa leikkaussaliblokkiesi kanssa (jos käytät blokkiaikataulutusta)

## 5. Simulaatioiden ajaminen

Kun parametrit, blokit ja leikkauslista on määritetty:

1. Napsauta **Aja simulaatio** -painiketta
2. Odota simulaation valmistumista (edistyminen näytetään)
3. Tulokset ilmestyvät alla olevaan tulososioon

### Tärkeitä vinkkejä:
- Varmista, että potilasjakaumasi on yhteensä 100%
- Jos käytät blokkiaikataulutusta, varmista että olet luonut leikkauslistan
- Pidemmät simulaatiot (enemmän päiviä) tarjoavat tilastollisesti luotettavampia tuloksia
- Aloita yksinkertaisella kokoonpanolla ja lisää vähitellen monimutkaisuutta

## 6. Tulosten analysointi

Simulaation ajamisen jälkeen voit analysoida tuloksia:

1. Navigoi tulosvälilehtien läpi:
   - **Tulokset**: Keskeiset mittarit ja kaaviot
   - **Leikkausaikataulu**: Leikkausten aikajana
   - **Saliblokit**: Blokkien käyttöyhteenveto
   - **Gantt-kaavio**: Yksityiskohtainen aikajanavisualisointi

2. Keskeisiä analysoitavia mittareita:
   - **Keskimääräinen OR-odotusaika**
   - **Keskimääräinen PACU-aika**
   - **Keskimääräinen osastosiirtoviive**
   - **PACU-estoaika**
   - **OR-käyttöaste**
   - **Keskimääräinen käyttöaste**

3. Käytä kaavioita tunnistaaksesi:
   - Pullonkaulat prosessissa
   - Alihyödynnetyt resurssit
   - Huippukysynnän ajanjaksot
   - Potilasvirran ongelmat

## 7. Optimoijan käyttäminen

Optimoija auttaa löytämään tehokkaampia leikkausaikatauluja:

1. Siirry **Optimointi**-välilehdelle
2. Määritä optimointiparametrit:
   - **Alpha**: Painoarvo leikkaussalin käyttöasteelle
   - **Beta**: Painoarvo heräämön estoajalle
   - **Gamma**: Painoarvo osastosiirtoviiveille
   - **Maksimi-iteraatiot**: Korkeammat arvot antavat parempia tuloksia mutta kestävät kauemmin
   - **Lämpötila**: Aloituslämpötila simuloidulle jäähdytykselle
   - **Jäähdytysnopeus**: Kuinka nopeasti algoritmi suppenee

3. Napsauta **Käynnistä optimointi**
4. Tarkastele optimointituloksia:
   - Alkuperäinen pistemäärä vs. paras pistemäärä
   - Prosentuaalinen parannus
   - Napsauta **Näytä optimoitu leikkauslista** nähdäksesi uuden aikataulun

## 8. Skenaarioiden hallinta

Skenaariot mahdollistavat erilaisten simulaatioasetusten tallentamisen ja vertailun:

1. Siirry **Skenaariot**-välilehdelle
2. Tallentaaksesi nykyisen skenaarion:
   - Syötä nimi ja kuvaus
   - Lisää tageja helpompaa suodatusta varten
   - Napsauta **Tallenna skenaario**

3. Ladataksesi tallennetun skenaarion:
   - Selaa tallennettujen skenaarioiden listaa
   - Napsauta skenaariota nähdäksesi yksityiskohdat
   - Napsauta **Lataa skenaario** soveltaaksesi sitä

4. Vertaillaksesi skenaarioita:
   - Valitse useita skenaarioita valintaruutujen avulla
   - Napsauta **Vertaile valittuja**
   - Tarkastele vertailukaavioita ja -taulukoita

## 9. Raporttien vienti

Jakaaksesi tai dokumentoidaksesi simulaatiotuloksiasi:

1. Siirry **Raportit**-välilehdelle
2. Määritä raporttisi:
   - Valitse sisällytettävät mittarit
   - Valitse sisällytettävät kaaviot
   - Lisää kommentteja tai huomautuksia

3. Vientivaihtoehdot:
   - **Vie CSV:nä**: Jatkoanalyysia varten Excelissä
   - **Vie PDF:nä**: Esityksiä ja dokumentointia varten
   - **Tulosta**: Lähetä suoraan tulostimelle

## 10. Vianmääritys

### Yleisiä ongelmia ja ratkaisuja:

#### Tyhjät simulaatiotulokset
Jos simulaatiosi näyttää nollia kaikille mittareille:
- Varmista, että olet luonut leikkauslistan
- Tarkista, että leikkaussaliblokkisi on määritetty oikein
- Varmista, että potilasjakauma on yhteensä 100%
- Lisää simulaatiopäivien määrää

#### Pitkät simulaatioajat
Jos simulaatiot kestävät liian kauan:
- Vähennä simulaatiopäivien määrää
- Yksinkertaista leikkaussaliblokkien määritystä
- Vähennä potilasluokkien määrää
- Sulje muita sovelluksia vapauttaaksesi resursseja

#### Epärealistiset tulokset
Jos tulokset eivät vastaa odotuksia:
- Tarkista syöttöparametrit todellisen maailman dataa vastaan
- Tarkista potilasluokka-asetukset (leikkausten kestot, PACU-ajat)
- Varmista, että hoitajamiehitystasot ovat realistisia
- Säädä hoitaja-potilassuhdetta vastaamaan laitostasi

#### Optimointi ei paranna
Jos optimointi näyttää minimaalista parannusta:
- Lisää maksimi-iteraatioiden määrää
- Säädä painoarvoja (alpha, beta, gamma)
- Lisää aloituslämpötilaa
- Vähennä jäähdytysnopeutta
- Varmista, että alkuperäisessä aikataulussa on varaa parantaa

## Yhteenveto

PACU Flow Vision on tehokas työkalu sairaalan työnkulkujen mallintamiseen ja optimointiin. Tätä opasta seuraamalla sinun pitäisi pystyä luomaan realistisia simulaatioita, tunnistamaan pullonkauloja ja optimoimaan resurssejasi parempaa potilashoitoa ja operatiivista tehokkuutta varten.

Muista, että simulaatiotulokset ovat vain yhtä hyviä kuin syötetty data. Käytä aikaa parametriesi kalibrointiin todellisen maailman havaintojen perusteella saadaksesi tarkimmat ja hyödyllisimmät tulokset.
