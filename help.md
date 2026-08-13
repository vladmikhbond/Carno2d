# Допомога

## Зміст

- [Розмір простору моделі](#rozmir-prostoru-modeli)
- [Виконання сценарію](#vikonannya-scenariyu)
- [Команди](#komandi)
- [Керування переглядом](#keruvannya-pereglyadom)
- [Стан поршня](#stan-porshnya)
- [Збереження і відтворення сценаріїв](#zberezhennya-i-vidtvorennya-scenariyiv)
- [Приклади сценаріїв](#prikladi-scenariyiv)

<a id="rozmir-prostoru-modeli"></a>
## Розмір простору моделі

*W*  - ширина модельного простору (100 < W < 10000).

*H*  - висота модельного простору (100 < H < 10000).

Після зміни параметрів натисніть Enter, щоб зміни почали діяти.
Зміна розмірів створює новий пустий модельний простір.

<a id="vikonannya-scenariyu"></a>
## Виконання сценарію

Сценарій це послідовнвсть команд, в одному рядку одна команда.

Для виконання сценарій треба помістити в поле сенарію і натиснути кнопку Exec.

При виконанні комад, пов'язаних з рухом газу, кнопка Run зупиняє або продовжує плин модельного часу.

Кожна виконана команда отрмує позначку бара, команда, яка виконується, позначається трикутником.

Коли виконання сценарію скінчилося, його можна доповнити новими командами.
Для виконання доданих команд треба знову натиснути кнопку Exec.

Щоб повторити повністю або частково виконаний сценарій, треба натиснути кнопку C, а потім Exec.

<a id="komandi"></a>
## Команди

Команда складається з назви і параметрів, роздільник між ними пробіл.
Всі інші пробіли значення не мають.

Параметри подаються в форматі 'ім'я=значення' і розділяються комами.
Справа від знаку рівняння стоїть значення за замовчанням.

| Назва | Параметри | Зміст |
| :--- | :--- | :--- |
| title | рядок | рядок відображується в заголовку сторінки |
| plunger | m=100, t=100, n=10000 | створюється поршень |
| scale | p=1, t=1, s=1, v=1, x=1 | масштабування тиску |
| intake | v=, n= | впуск |
| compression | m=, v= | стиск |
| ignition | rate=, t= | запалювання |
| expansion | m=, v= | розширення (робочий хід) |
| exhaust | m=| випуск |
| isobaric | v= | ізобара |
| adiabatic | m= | адіабата |
| isohoric | m= | ізохора |
| isothermic | m= | ізотерма |
| calm | time=400 | заспокоєння коливань поршня, time - кількість тактів |
| run | time=1e6 | просто робить кроки, time - кількість тактів |

<a id="keruvannya-pereglyadom"></a>
## Керування переглядом

Слайдер *Vis*   - встановлює процент часток газу, що відображуються.

Флаг *Pretty*   - робить лінії діаграм гладкішими.

Слайдер *Speed* - встановлює інтервал в msec між двома сусідніми моментами модельного часу.

<a id="stan-porshnya"></a>
## Стан поршня

Стан газу під поршнем відображується за допомогою трьох діаграм: PV, TV, SV

Клавіши 'p', 't', 'v', 's', 'x' керують масштабом діаграм поршня, велика буква збільшує масштаб, мала - зменшує.

Клавіша 'f' фіксує або звільняє поршень.

Клавіша '1' робить один крок в моедному часі.

Клавіша '0' очищує діаграми.

<a id="zberezhennya-i-vidtvorennya-scenariyiv"></a>
## Збереження і відтворення сценаріїв

Кнопка **⬇** - зберігає поточний сценарій у локальному сховищі браузера.

Кнопка **⬆** - завантажує збережений сценарій.

В обох випадках ключ збереження має бути в нижньому полі вводу.

Якщо Chrome зберігає, але не завантажує сценарії, треба змінити його налаштування.

```text
Settings
→ Privacy and security
→ Site settings
→ Additional content settings
→ On-device site data
          Allow sites to save data on your device
```

## Приклади сценаріїв

<a id="prikladi-scenariyiv"></a>

```javascript
title adiabatic_test
plunger m=3000, t=100
scale   p=6, t=13.5, s=0.4, x=2.4
adiabatic  m=550, time=2000
calm       time=500
adiabatic  m=3000, time=2000

title isobaric_test
plunger m=3000, t=100
run time=999
scale   p=4.5, t=8, s=0.2, x=1.3, v=2.5 
isobaric   v=50000, time=1000
run time=1000
isobaric   v=22800, time=1000
run time=1000

title isohoric_test
plunger m=3000, t=126
run time=999
scale   p=6, t=11, s=0.16, x=2.1, v=3
isohoric   m=900, time=1000
run time=1000
isohoric  m=3000, time=1000
run time=1000

title isothermic_test
plunger m=3000, t=126
run time=1000
scale   p=6, t=18, s=0.4, x=1.7, v=1.5
isothermic  m=1000, time=2000
run time=1000
isothermic  m=3000, time=2000 
run time=1000

title         Цикл Отто (бензиновий)
plunger m=100, n=0
scale       p=0.1, t=0.8, s=0.1, v=1.2, x=0.1
intake      v=90000, nk=10
compression m=8500,   v=12000
ignition    rate=1.1, t=2000
expansion   m=16000,  v=88000
exhaust     m=1000,   v=8000  

title   Цикл Брайтона (квазістаціонарний)
plunger m=3000, t=111.4
scale   p=5.5, t=9.2, s=0.36, x=1.5
isobaric   v=36000
adiabatic  m=550
isobaric   v=57000
adiabatic  m=3000

title   Зворотний цикл Брайтона
plunger m=3000, t=111.4
scale   p=5.5, t=9.2, s=0.36, x=1.5
adiabatic  m=550
isobaric   v=86000
adiabatic  m=3000
isobaric   v=24700

title   Цикл Карно
plunger m=3000, t=126
run time=999
scale   p=6, t=10, s=0.7, x=1.6
isothermic  m=1600
adiabatic   m=600
isothermic  m=1100
adiabatic   m=3000
run time=1000

title   Зворотний цикл Карно
plunger m=3000, t=126
run time=999
scale   p=6, t=10, s=0.7, x=1.6
adiabatic   m=1100
isothermic  m=600
adiabatic   m=1600
isothermic  m=3000
run time=1000

title   Цикл Отто (квазістаціонарний)
plunger m=3000, t=126
scale   p=6, t=11, s=0.33, x=1.6
adiabatic  m=1000
isohoric   m=300
adiabatic  m=900
isohoric   m=3000

title   Зворотний цикл Отто (квазістаціонарний)
plunger m=3000, t=126
scale   p=6, t=11, s=0.33, x=1.6
isohoric   m=900
adiabatic  m=300
isohoric   m=1000
adiabatic  m=3000
```
