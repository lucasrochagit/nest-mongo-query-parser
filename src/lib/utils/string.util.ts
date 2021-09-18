export class StringUtils {
  public static splitString(param: string, sep: string): string[] {
    return param.split(sep).filter((param: string) => !!param);
  }

  public static cleanString(str: string, reg: RegExp): string {
    return str.replace(reg, '');
  }

  public static testString(str: string, reg: RegExp): boolean {
    return reg.test(str);
  }
}
